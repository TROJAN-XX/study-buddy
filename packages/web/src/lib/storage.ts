import { generateId } from './utils';
import { EXAMS, SAMPLE_QUESTIONS, SAMPLE_NOTES } from '@study-buddy/shared';
import type { Exam, Question, Note } from '@study-buddy/shared';

export const STORAGE_KEYS = {
  EXAMS: 'sb_exams',
  SESSIONS: 'sb_sessions',
  GOALS: 'sb_goals',
  QUESTIONS: 'sb_questions',
  TESTS: 'sb_tests',
  ATTEMPTS: 'sb_attempts',
  MISTAKES: 'sb_mistakes',
  REVISION: 'sb_revision',
  NOTES: 'sb_notes',
  BOOKMARKS: 'sb_bookmarks',
  SYNC_QUEUE: 'sb_sync_queue',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// ─── IndexedDB Configuration ──────────────────────────────────────

const IDB_NAME = 'study-buddy';
const IDB_VERSION = 3;
const MIGRATION_FLAG = 'sb_idb_migrated_v1';

/** Object stores that hold domain collections (the sync queue is separate). */
const COLLECTION_STORES: string[] = Object.values(STORAGE_KEYS).filter(
  (key) => key !== STORAGE_KEYS.SYNC_QUEUE
);

let dbPromise: Promise<IDBDatabase> | null = null;
let seedPromise: Promise<void> | null = null;

/**
 * Open (or create) the IndexedDB database. A single connection is kept alive
 * for the lifetime of the tab: closing it after every operation leaves the
 * cached promise pointing at a closed handle, which breaks all later reads.
 */
function openIDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };

    request.onblocked = () => {
      // Another tab holds an older version open; the upgrade waits for it.
      console.warn('[storage] IndexedDB upgrade blocked by another tab.');
    };

    request.onsuccess = () => {
      const db = request.result;
      // If a newer version is opened elsewhere, release this handle so the
      // other tab can upgrade, then reconnect lazily on next access.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      COLLECTION_STORES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });

      if (!db.objectStoreNames.contains(STORAGE_KEYS.SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORAGE_KEYS.SYNC_QUEUE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        queueStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });

  return dbPromise;
}

function isIDBAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.indexedDB;
}

/* ─── localStorage Fallback ──────────────────────────────────────── */

function readLocalStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return [];
  }
}

function writeLocalStorage<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
  }
}

/* ─── IndexedDB Operations ───────────────────────────────────────── */

async function readIDB<T>(storeName: string): Promise<T[]> {
  const db = await openIDB();
  return new Promise<T[]>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function writeIDB<T>(storeName: string, data: T[]): Promise<void> {
  const db = await openIDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);

    const store = tx.objectStore(storeName);
    store.clear();
    for (const item of data) {
      // `put` is used so re-importing the same backup is idempotent.
      store.put(item);
    }
  });
}

async function idbCreate<T extends { id: string }>(storeName: string, item: T): Promise<T> {
  const db = await openIDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    tx.objectStore(storeName).add(item);
  });
  return item;
}

async function idbUpdate<T extends { id: string }>(
  storeName: string,
  id: string,
  updates: Partial<T>
): Promise<T | null> {
  const db = await openIDB();
  return new Promise<T | null>((resolve, reject) => {
    let updated: T | null = null;

    const tx = db.transaction(storeName, 'readwrite');
    tx.oncomplete = () => resolve(updated);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);

    const store = tx.objectStore(storeName);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result as T | undefined;
      if (!existing) return;
      updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      } as T;
      store.put(updated);
    };
  });
}

async function idbRemove(storeName: string, id: string | number): Promise<boolean> {
  const db = await openIDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    tx.objectStore(storeName).delete(id);
  });
  return true;
}

/* ─── One-time localStorage → IndexedDB Migration ────────────────── */

async function migrateLocalStorageToIDB(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if (localStorage.getItem(MIGRATION_FLAG) === '1') return;

    for (const key of COLLECTION_STORES) {
      const local = readLocalStorage<unknown>(key);
      if (local.length === 0) continue;

      // Never overwrite data that already exists in IndexedDB.
      const existing = await readIDB<unknown>(key);
      if (existing.length === 0) {
        await writeIDB(key, local);
        console.info(`[storage] Migrated ${local.length} record(s) from localStorage key "${key}".`);
      }
    }

    localStorage.setItem(MIGRATION_FLAG, '1');
  } catch (error) {
    console.error('[storage] localStorage → IndexedDB migration failed:', error);
  }
}

/* ─── Seed Data ──────────────────────────────────────────────────── */

async function seedCollections(): Promise<void> {
  if (typeof window === 'undefined') return;

  if (isIDBAvailable()) {
    try {
      await migrateLocalStorageToIDB();

      const [exams, questions, notes] = await Promise.all([
        readIDB<Exam>(STORAGE_KEYS.EXAMS),
        readIDB<Question>(STORAGE_KEYS.QUESTIONS),
        readIDB<Note>(STORAGE_KEYS.NOTES),
      ]);

      if (exams.length === 0) await writeIDB(STORAGE_KEYS.EXAMS, EXAMS);
      if (questions.length === 0) await writeIDB(STORAGE_KEYS.QUESTIONS, SAMPLE_QUESTIONS);
      if (notes.length === 0) await writeIDB(STORAGE_KEYS.NOTES, SAMPLE_NOTES);
      return;
    } catch (error) {
      console.error('[storage] IndexedDB seeding failed, using localStorage:', error);
    }
  }

  // localStorage fallback path
  if (readLocalStorage<Exam>(STORAGE_KEYS.EXAMS).length === 0) {
    writeLocalStorage(STORAGE_KEYS.EXAMS, EXAMS);
  }
  if (readLocalStorage<Question>(STORAGE_KEYS.QUESTIONS).length === 0) {
    writeLocalStorage(STORAGE_KEYS.QUESTIONS, SAMPLE_QUESTIONS);
  }
  if (readLocalStorage<Note>(STORAGE_KEYS.NOTES).length === 0) {
    writeLocalStorage(STORAGE_KEYS.NOTES, SAMPLE_NOTES);
  }
}

/**
 * Ensures seed data exists exactly once. Every read/write awaits this promise,
 * which removes the previous race where the Dashboard could query an empty
 * database before the fire-and-forget seed finished.
 */
function ready(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedCollections().catch((error) => {
      console.error('[storage] Initialization failed:', error);
    });
  }
  return seedPromise;
}

/* ─── Sync Queue (IndexedDB) ─────────────────────────────────────── */

export type SyncMutation =
  | { op: 'create'; store: string; data: Record<string, unknown> }
  | { op: 'update'; store: string; id: string; data: Record<string, unknown> }
  | { op: 'delete'; store: string; id: string }
  | {
      op: 'submit_test';
      test: Record<string, unknown>;
      attempts: Record<string, unknown>[];
    }
  | {
      op: 'import_questions';
      questions: Record<string, unknown>[];
      strategy: 'skip' | 'overwrite';
    }
  | {
      op: 'review_revision';
      id: string;
      grade: 'easy' | 'difficult' | 'forgot';
    }
  | {
      op: 'reschedule_revisions';
      mode: 'spread_3_days' | 'defer_tomorrow' | 'reset';
    }
  | {
      op: 'restore_backup';
      data: Record<string, unknown>;
    }
  | {
      op: 'delete_bookmark';
      targetType: string;
      targetId: string;
    }
  | {
      op: 'carry_forward_goals';
    };

export type SyncQueueEntry = SyncMutation & {
  id: number;
  createdAt: string;
};

/** Stores whose creates are handled by a dedicated endpoint (not generic POST). */
const NO_GENERIC_CREATE = new Set<string>([
  STORAGE_KEYS.TESTS,
  STORAGE_KEYS.ATTEMPTS,
  STORAGE_KEYS.QUESTIONS,
]);

/**
 * Push a mutation to the offline sync queue.
 */
export async function enqueueSync(mutation: SyncMutation): Promise<void> {
  if (!isIDBAvailable()) return;
  try {
    const db = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORAGE_KEYS.SYNC_QUEUE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);

      const entry: Omit<SyncQueueEntry, 'id'> = {
        ...mutation,
        createdAt: new Date().toISOString(),
      };
      tx.objectStore(STORAGE_KEYS.SYNC_QUEUE).add(entry);
    });
  } catch (error) {
    console.error('[storage] Failed to enqueue sync mutation:', error);
  }
}

async function readSyncQueue(): Promise<SyncQueueEntry[]> {
  if (!isIDBAvailable()) return [];
  try {
    const queue = await readIDB<SyncQueueEntry>(STORAGE_KEYS.SYNC_QUEUE);
    return queue.sort((a, b) => a.id - b.id);
  } catch {
    return [];
  }
}

async function removeSyncEntry(id: number): Promise<void> {
  if (!isIDBAvailable()) return;
  try {
    // The queue uses an auto-increment numeric key, so the key type matters:
    // deleting "5" would not remove key 5.
    await idbRemove(STORAGE_KEYS.SYNC_QUEUE, id);
  } catch (error) {
    console.error('[storage] Failed to remove sync entry:', error);
  }
}

/* ─── Public Storage API ─────────────────────────────────────────── */

export const storage = {
  /** All items for a collection. Falls back to localStorage if IDB fails. */
  async getAll<T>(key: string): Promise<T[]> {
    await ready();
    if (isIDBAvailable()) {
      try {
        return await readIDB<T>(key);
      } catch (error) {
        console.error(`[storage] IndexedDB read failed for "${key}" — falling back:`, error);
      }
    }
    return readLocalStorage<T>(key);
  },

  async getById<T extends { id: string }>(key: string, id: string): Promise<T | null> {
    const items = await storage.getAll<T>(key);
    return items.find((item) => item.id === id) ?? null;
  },

  /**
   * Create an item locally and enqueue it for server sync.
   * Tests/attempts/questions are excluded here because they are pushed through
   * their dedicated endpoints (submit / import).
   */
  async create<T extends { id: string }>(
    key: string,
    item: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & Partial<T>
  ): Promise<T> {
    await ready();
    const now = new Date().toISOString();
    const newItem = {
      createdAt: now,
      updatedAt: now,
      ...item,
      id: (item as { id?: string }).id || generateId(),
    } as unknown as T;

    if (isIDBAvailable()) {
      try {
        await idbCreate(key, newItem);
      } catch (error) {
        console.error(`[storage] IndexedDB create failed for "${key}", using localStorage:`, error);
        const items = readLocalStorage<T>(key);
        items.unshift(newItem);
        writeLocalStorage(key, items);
      }
    } else {
      const items = readLocalStorage<T>(key);
      items.unshift(newItem);
      writeLocalStorage(key, items);
    }

    if (!NO_GENERIC_CREATE.has(key)) {
      await enqueueSync({ op: 'create', store: key, data: newItem as unknown as Record<string, unknown> });
    }

    return newItem;
  },

  /** Update locally and enqueue for server sync. */
  async update<T extends { id: string; updatedAt?: string }>(
    key: string,
    id: string,
    updates: Partial<T>
  ): Promise<T | null> {
    await ready();

    if (isIDBAvailable()) {
      try {
        const updated = await idbUpdate<T>(key, id, updates);
        if (updated) {
          await enqueueSync({ op: 'update', store: key, id, data: updates as Record<string, unknown> });
        }
        return updated;
      } catch (error) {
        console.error(`[storage] IndexedDB update failed for "${key}", using localStorage:`, error);
      }
    }

    const items = readLocalStorage<T>(key);
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const updatedItem = {
      ...items[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    items[index] = updatedItem;
    writeLocalStorage(key, items);
    await enqueueSync({ op: 'update', store: key, id, data: updates as Record<string, unknown> });
    return updatedItem;
  },

  /** Remove locally and enqueue for server sync. */
  async remove(key: string, id: string): Promise<boolean> {
    await ready();

    let removed = false;

    if (isIDBAvailable()) {
      try {
        await idbRemove(key, id);
        removed = true;
      } catch (error) {
        console.error(`[storage] IndexedDB remove failed for "${key}", using localStorage:`, error);
      }
    }

    if (!removed) {
      const items = readLocalStorage<{ id: string }>(key);
      const filtered = items.filter((item) => item.id !== id);
      removed = filtered.length !== items.length;
      if (removed) writeLocalStorage(key, filtered);
    }

    if (removed) {
      await enqueueSync({ op: 'delete', store: key, id });
    }

    return removed;
  },

  /**
   * Bulk replace (no per-row queue entry). Used by backup restore,
   * carry-forward and rescheduling, which call their bulk endpoints directly.
   */
  async setAll<T>(key: string, items: T[]): Promise<void> {
    await ready();
    if (isIDBAvailable()) {
      try {
        await writeIDB(key, items);
        return;
      } catch (error) {
        console.error(`[storage] IndexedDB setAll failed for "${key}", using localStorage:`, error);
      }
    }
    writeLocalStorage(key, items);
  },

  /** Clear every collection and the sync queue, then re-seed defaults. */
  async clearAll(): Promise<void> {
    if (typeof window === 'undefined') return;

    if (isIDBAvailable()) {
      try {
        const db = await openIDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(Object.values(STORAGE_KEYS), 'readwrite');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
          Object.values(STORAGE_KEYS).forEach((storeName) => {
            tx.objectStore(storeName).clear();
          });
        });
      } catch (error) {
        console.error('[storage] IndexedDB clearAll failed, using localStorage:', error);
      }
    }

    Object.values(STORAGE_KEYS).forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore quota/security errors */
      }
    });

    // Force re-seed on the next read.
    seedPromise = null;
    await ready();
  },

  /** Pending sync mutations, oldest first. */
  async getSyncQueue(): Promise<SyncQueueEntry[]> {
    return readSyncQueue();
  },

  async removeSyncEntry(id: number): Promise<void> {
    await removeSyncEntry(id);
  },

  /** Explicitly enqueue a mutation that is not a plain collection write. */
  async enqueue(mutation: SyncMutation): Promise<void> {
    await enqueueSync(mutation);
  },

  isIDBAvailable(): boolean {
    return isIDBAvailable();
  },
};

// Kick off seeding immediately; every public read awaits the same promise.
void ready();
