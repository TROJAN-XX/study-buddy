# Changelog

All notable changes to Study Buddy are documented here.  
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned with [SemVer](https://semver.org/).

---

## [1.1.0] — 2026-10-24

Reliability, offline-sync and polish release. No breaking changes to the local data model; an
automatic localStorage → IndexedDB migration runs once on first load.

### Added

- **Offline mutation queue** (`packages/web/src/lib/sync.ts`): every local write is queued in
  IndexedDB (`sb_sync_queue`) and flushed on startup, on `online`, every 30 s, and shortly after
  each mutation. Entries are only removed after the Worker acknowledges them.
- **Sync status UI** (`components/NetworkStatus.tsx`): offline banner and pending-change counter.
- **Shared HTTP layer** (`lib/http.ts`): single source for `VITE_API_URL` / `VITE_API_TOKEN`,
  Bearer auth, and real success/failure results (previously every non-2xx was silently swallowed).
- **Bookmarks API** (`GET/POST /api/v1/bookmarks`, `DELETE /api/v1/bookmarks/:id`) with a
  `UNIQUE(target_type, target_id)` constraint.
- **Client-generated IDs accepted by the API** for sessions, goals, notes and bookmarks so queue
  replays are idempotent instead of creating duplicates.
- **Global search page** (`/search`) across questions, notes, mistakes and sessions — fully offline.
- **Markdown + KaTeX rendering** (`components/Markdown.tsx`), used by the notebook, note preview,
  quiz runner, library and result summary. Math delimiters: `$…$`, `$$…$$`, `\(…\)`, `\[…\]`.
- **PWA icons** (`pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png`), a Workbox
  `navigateFallback` for offline deep links, `public/_redirects` and `public/_headers`.
- **ErrorBoundary** and a real **404 page** (unknown routes no longer silently redirect home).
- **Unit tests** (Vitest) for question-pack validation, API Zod schemas and shared utilities.
- **GitHub Actions CI** (`.github/workflows/ci.yml`): typecheck → tests → production build.
- Documentation: this changelog, [`docs/OFFLINE_SYNC.md`](./docs/OFFLINE_SYNC.md), refreshed
  `README.md`, `PENDING_WORK.md` and `AGENTS.md`.

### Changed

- **IndexedDB lifecycle fixed**: one long-lived connection is reused; it is closed only on
  `versionchange`. Previously the cached promise pointed at a closed database after the first
  operation, so later reads failed and silently fell back to stale localStorage.
- **Seeding is awaited** before the first read (`ready()`), removing the empty-dashboard race.
- **Writes are local-first**: `apiClient` no longer double-writes (local + direct POST). Mutations
  go through the queue; reads remain remote-first with local fallback.
- **Practice test submission** is a single queued `submit_test` mutation that posts test + attempts
  atomically to `/practice/tests/submit`.
- **`isBookmarked`** now matches on `targetType` + `targetId` (previously any bookmark with the
  same id, regardless of type).
- **Question shuffling** uses an unbiased Fisher–Yates helper instead of `sort(() => Math.random())`.
- **Weak-area dismissals** persist to localStorage instead of resetting on reload.
- **Quiz config presets** are re-applied every time the modal opens; the Current Affairs feed now
  deep-links to a pre-filtered recall quiz.
- **Google Fonts removed** from `index.html`; the app uses the system font stack and works offline.
- **Manifest** is generated solely by `vite-plugin-pwa` (the hand-written `public/manifest.json`
  was deleted, fixing icon 404s and the duplicate manifest link).

### Fixed

- TypeScript build failures in `lib/sync.ts` (missing exported type, cleanup return type).
- Foreign-key mismatch where a mistake row referenced an attempt id that was generated but never
  persisted (`routes/practice.ts`).
- Duplicate/dead `features/library/CurrentAffairsFeed.tsx` and `features/library/StudyNotebook.tsx`
  removed (the live implementations live in `features/notes/`).
- `storage.create/update/remove` are now fully `await`ed by callers (no floating promises).
- Schema: JSON columns validated with `json_valid`, FKs declared, bookmark uniqueness enforced,
  unused `subject_id`/`topic_id` columns dropped. `0003_integrity_indexes.sql` upgrades existing
  databases safely.

### Known limitations

- Sync is last-write-wins per record; there is no field-level merge or tombstone log.
- `sb_revision` and `sb_exams` creations have no generic REST endpoints (revisions are created by
  the practice submission flow and mutated through review/reschedule).
- No end-to-end (browser) test suite yet.
