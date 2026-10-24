import { storage } from './storage';
import type { SyncMutation, SyncQueueEntry } from './storage';
import { apiRequest, isApiConfigured } from './http';

export interface SyncResult {
  processed: number;
  failed: number;
  skipped: number;
}

/** Collection store → REST endpoint. `null` means "no generic endpoint". */
const STORE_ENDPOINTS: Record<string, string | null> = {
  sb_exams: '/api/v1/exams',
  sb_sessions: '/api/v1/sessions',
  sb_goals: '/api/v1/goals',
  sb_questions: '/api/v1/questions',
  sb_tests: null, // submitted via /practice/tests/submit
  sb_attempts: null, // submitted via /practice/tests/submit
  sb_mistakes: '/api/v1/mistakes',
  sb_revision: null, // mutated through /revisions/:id/review & /reschedule
  sb_notes: '/api/v1/notes',
  sb_bookmarks: '/api/v1/bookmarks',
};

let isProcessing = false;

function notify(result: SyncResult): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<SyncResult>('studybuddy:sync', { detail: result }));
  }
}

/**
 * Send one queued mutation to the Worker.
 * Returns false when the mutation has no server counterpart (skipped).
 * Throws on transport/server failure so the entry stays queued for retry.
 */
async function processMutation(entry: SyncQueueEntry): Promise<boolean> {
  if (entry.op === 'submit_test') {
    const result = await apiRequest<unknown>('/api/v1/practice/tests/submit', {
      method: 'POST',
      body: JSON.stringify({ test: entry.test, attempts: entry.attempts }),
    });
    if (!result.ok) throw new Error(result.error);
    return true;
  }

  if (entry.op === 'import_questions') {
    const result = await apiRequest<unknown>(
      `/api/v1/questions/import?strategy=${entry.strategy}`,
      {
        method: 'POST',
        body: JSON.stringify(entry.questions),
      }
    );
    if (!result.ok) throw new Error(result.error);
    return true;
  }

  if (entry.op === 'review_revision') {
    const result = await apiRequest<unknown>(
      `/api/v1/revisions/${encodeURIComponent(entry.id)}/review`,
      {
        method: 'POST',
        body: JSON.stringify({ grade: entry.grade }),
      }
    );
    if (!result.ok) throw new Error(result.error);
    return true;
  }

  if (entry.op === 'reschedule_revisions') {
    const result = await apiRequest<unknown>('/api/v1/revisions/reschedule', {
      method: 'POST',
      body: JSON.stringify({ mode: entry.mode }),
    });
    if (!result.ok) throw new Error(result.error);
    return true;
  }

  if (entry.op === 'restore_backup') {
    const result = await apiRequest<unknown>('/api/v1/backup/import', {
      method: 'POST',
      body: JSON.stringify(entry.data),
    });
    if (!result.ok) throw new Error(result.error);
    return true;
  }

  if (entry.op === 'delete_bookmark') {
    // Delete by target so a locally generated id that differs from the server
    // row still removes the right bookmark.
    const result = await apiRequest<unknown>(
      `/api/v1/bookmarks/target/${encodeURIComponent(entry.targetType)}/${encodeURIComponent(entry.targetId)}`,
      { method: 'DELETE' }
    );
    if (!result.ok) throw new Error(result.error);
    return true;
  }

  if (entry.op === 'carry_forward_goals') {
    const result = await apiRequest<unknown>('/api/v1/goals/carry-forward', {
      method: 'POST',
    });
    if (!result.ok) throw new Error(result.error);
    return true;
  }

  const endpoint = STORE_ENDPOINTS[entry.store];
  if (!endpoint) {
    console.debug(`[sync] No REST endpoint for "${entry.store}" (${entry.op}); skipping.`);
    return false;
  }

  if (entry.op === 'create') {
    const result = await apiRequest<unknown>(endpoint, {
      method: 'POST',
      body: JSON.stringify(entry.data),
    });
    if (!result.ok) throw new Error(result.error);
    return true;
  }

  if (entry.op === 'update') {
    const result = await apiRequest<unknown>(`${endpoint}/${encodeURIComponent(entry.id)}`, {
      method: 'PUT',
      body: JSON.stringify(entry.data),
    });
    if (!result.ok) throw new Error(result.error);
    return true;
  }

  // delete
  const result = await apiRequest<unknown>(`${endpoint}/${encodeURIComponent(entry.id)}`, {
    method: 'DELETE',
  });
  if (!result.ok) throw new Error(result.error);
  return true;
}

/**
 * Flush the offline queue in order. Entries are only removed after the server
 * acknowledges them; the first failure stops the run so ordering is preserved.
 */
export async function flushSyncQueue(): Promise<SyncResult> {
  const result: SyncResult = { processed: 0, failed: 0, skipped: 0 };

  if (!isApiConfigured()) return result;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return result;
  if (isProcessing) return result;

  isProcessing = true;

  try {
    const queue = await storage.getSyncQueue();

    for (const entry of queue) {
      try {
        const sent = await processMutation(entry);
        await storage.removeSyncEntry(entry.id);
        if (sent) result.processed += 1;
        else result.skipped += 1;
      } catch (error) {
        const label =
          entry.op === 'create' || entry.op === 'update' || entry.op === 'delete'
            ? entry.store
            : entry.op;
        console.warn(`[sync] Failed ${entry.op} for ${label}; will retry.`, error);
        result.failed += 1;
        break;
      }
    }
  } finally {
    isProcessing = false;
  }

  if (result.processed > 0 || result.failed > 0) notify(result);
  return result;
}

/** Number of mutations waiting to be sent. */
export async function getPendingSyncCount(): Promise<number> {
  const queue = await storage.getSyncQueue();
  return queue.length;
}

/**
 * Flush soon (used right after a local mutation) without blocking the caller.
 */
export function scheduleSync(): void {
  if (typeof window === 'undefined') return;
  if (!isApiConfigured()) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  window.setTimeout(() => {
    void flushSyncQueue();
  }, 250);
}

let teardown: (() => void) | null = null;

/**
 * Background sync: flush on startup, when connectivity returns, and every 30s
 * while online. Returns a cleanup function (useful for HMR / tests).
 */
export function initBackgroundSync(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  if (teardown) return teardown;

  const handleFlush = () => {
    void flushSyncQueue();
  };

  const handleOnline = () => {
    // Give the network stack a moment before retrying.
    window.setTimeout(handleFlush, 1000);
  };

  const handleOffline = () => {
    console.debug('[sync] Offline — mutations will be queued.');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('load', handleFlush);

  const intervalId = window.setInterval(() => {
    if (navigator.onLine) void flushSyncQueue();
  }, 30_000);

  // Initial attempt (only if the queue has work, to avoid a needless request).
  void getPendingSyncCount().then((count) => {
    if (count > 0) handleFlush();
  });

  teardown = () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('load', handleFlush);
    window.clearInterval(intervalId);
    teardown = null;
  };

  return teardown;
}
