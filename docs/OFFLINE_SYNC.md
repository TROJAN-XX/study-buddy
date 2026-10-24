# Offline-First Data & Sync

Study Buddy is **local-first**: the app is fully usable with no network and no Worker deployed.
Cloudflare D1 is the durable backup, not the source of truth for rendering.

```
UI ──► apiClient ──► storage (IndexedDB) ──► sync queue ──► Worker API ──► D1
                          │
                          └── localStorage (fallback / legacy migration)
```

---

## 1. Storage layer

`packages/web/src/lib/storage.ts`

| Concern | Behaviour |
|---|---|
| Primary store | IndexedDB `study-buddy` (v3), one object store per collection + `sb_sync_queue` |
| Connection | Single long-lived connection; closed only on `versionchange` so other tabs can upgrade |
| Fallback | localStorage if IndexedDB is unavailable or a transaction fails |
| Seeding | `EXAMS`, `SAMPLE_QUESTIONS`, `SAMPLE_NOTES` are written once; every public read awaits `ready()` |
| Migration | One-time copy of legacy localStorage collections into IndexedDB (`sb_idb_migrated_v1`) |

Object stores: `sb_exams`, `sb_sessions`, `sb_goals`, `sb_questions`, `sb_tests`, `sb_attempts`,
`sb_mistakes`, `sb_revision`, `sb_notes`, `sb_bookmarks`, plus `sb_sync_queue` (auto-increment id).

`setAll()` performs a bulk replace **without** queueing. It is used by backup restore,
carry-forward, rescheduling and practice submission, which own their own atomic endpoint.

---

## 2. Mutation queue

Every `storage.create` / `update` / `remove` enqueues a `SyncMutation`:

```ts
type SyncMutation =
  | { op: 'create'; store: string; data: Record<string, unknown> }
  | { op: 'update'; store: string; id: string; data: Record<string, unknown> }
  | { op: 'delete'; store: string; id: string }
  | { op: 'submit_test'; test: Record<string, unknown>; attempts: Record<string, unknown>[] };
```

`submit_test` exists because a practice test and its attempts must reach
`POST /api/v1/practice/tests/submit` together — that endpoint also derives mistake and revision
rows server-side. Tests, attempts and question *creates* are therefore excluded from the generic
queue (`NO_GENERIC_CREATE`); question imports go through `/questions/import` directly.

### Endpoint map

| Store | Endpoint |
|---|---|
| `sb_sessions` | `/api/v1/sessions` |
| `sb_goals` | `/api/v1/goals` |
| `sb_exams` | `/api/v1/exams` (update only) |
| `sb_questions` | `/api/v1/questions` (delete) |
| `sb_mistakes` | `/api/v1/mistakes` |
| `sb_notes` | `/api/v1/notes` |
| `sb_bookmarks` | `/api/v1/bookmarks` |
| `sb_tests`, `sb_attempts` | submitted via `submit_test` |
| `sb_revision` | no generic endpoint (review/reschedule routes) |

Unmapped mutations are dropped from the queue after being counted as `skipped` — they are already
persisted locally and have no server counterpart.

---

## 3. Flush semantics

`flushSyncQueue()` in `packages/web/src/lib/sync.ts`:

1. No-op when `VITE_API_URL` is unset or `navigator.onLine === false` (the queue is untouched).
2. Reads the queue oldest-first.
3. Sends each mutation with `Authorization: Bearer <VITE_API_TOKEN>`.
4. Removes an entry **only** after `response.ok` and a valid `{ success: true }` envelope.
5. Stops at the first failure so ordering is preserved; the entry stays queued for the next run.

Triggers: app start (if the queue is non-empty), `online` event (+1 s), `load`, every 30 s while
online, and `scheduleSync()` 250 ms after a mutation when online.

`studybuddy:sync` custom events carry `{ processed, failed, skipped }`; `NetworkStatus` listens to
refresh the pending counter.

---

## 4. Idempotency & conflicts

- The client generates ids (`crypto.randomUUID()`) and the API honours them for sessions, goals,
  notes and bookmarks. Replaying a queued create therefore cannot duplicate a row.
- `INSERT OR IGNORE` + `UNIQUE(target_type, target_id)` makes bookmark creation idempotent.
- Conflict policy is **last write wins** per record. There is no per-field merge and no tombstone
  log; deletions are sent as deletes, so a stale offline edit of a deleted row will re-create it
  on the server only if it is re-submitted (it is not, because the local row is gone).

---

## 5. Verification

```bash
npm run typecheck   # all workspaces
npm test            # Vitest unit suite
npm run build       # production PWA + service worker
```

Manual checks:

1. Load the app with `VITE_API_URL` unset → everything works, no network calls.
2. Create a session offline → the amber “Offline · saved on this device” pill appears.
3. Reconnect → the pill switches to “Syncing N changes…”, then disappears.
4. Reload → data is still present (IndexedDB) and the queue is empty.
