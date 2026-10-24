# Study Buddy: Status & Remaining Work

> **Current state, verified gaps, and the next milestones.**  
> Last updated: 2026-10-24 (v1.1.0 hardening release).

---

## 1. Delivery Status

| Phase | Milestone | Status | Evidence |
|---|---|---|---|
| **Phase 1** | Foundation & Daily Study Loop | **COMPLETED** | Dashboard, tracker, goals + carry-forward, focus timer, D1 schema, backup/restore |
| **Phase 2** | Question Library & Practice Engine | **COMPLETED** | `PackImporterModal` + `validateQuestionPack`, `LibraryPage`, `QuizConfigModal`, `QuizRunner` |
| **Phase 3** | Mistake Book & Mock Analysis | **COMPLETED** | `TestResultSummary`, `MistakeBook`, `MistakeClassificationModal`, server-side mistake derivation |
| **Phase 4** | Revision Scheduler & Diagnosis | **COMPLETED** | `RevisionQueue` (modified SM-2), `WeakAreaDiagnosis` (15-attempt guard, persistent dismissals) |
| **Phase 5** | Notebook, Current Affairs & Search | **COMPLETED** | `NotebookPage`, `NoteModal` (Markdown + KaTeX), `CurrentAffairsFeed`, `SearchPage` |
| **Hardening** | Offline sync & production readiness | **COMPLETED** | IndexedDB lifecycle fix, mutation queue, Bookmarks API, PWA icons, `_redirects`/`_headers`, ErrorBoundary, tests, CI |

### Verification gates (must stay green)

```bash
npm run typecheck   # shared + api + web
npm test            # 19 Vitest unit tests
npm run build       # tsc && vite build (PWA + service worker)
npm run verify      # all of the above
```

---

## 2. Remaining Backlog

Nothing below blocks daily use. Items are ordered by user value.

### P2 — Product refinements

1. **Bidirectional note ↔ question linking**
   - `MistakeClassificationModal` mentions creating a concept note, but there is no persisted link.
   - Add `questionId?: string | null` to `Note` (types, D1 migration, mappers, validation) and a
     “Related note” action on mistakes/questions that opens `NoteModal` prefilled.
2. **Revision endpoint parity**
   - `sb_revision` has no generic `POST`/`PUT` route; revisions are created by
     `/practice/tests/submit` and mutated via `/revisions/:id/review` and `/reschedule`.
   - Add `POST /revisions` and `PUT /revisions/:id` so manual revision items can sync, then map
     `sb_revision` in `STORE_ENDPOINTS`.
3. **Current affairs recall quiz scoping**
   - The feed now deep-links to `/practice` with `presetSubject: 'Current Affairs'`.
   - Next step: scope by the selected month (e.g. pass `presetTopic`/date range) once question
     packs include current-affairs metadata.
4. **Exam creation UI**
   - Exams are seeded; only `PUT /exams/:id` exists. Add create/archive if custom exam targets are
     needed.

### P3 — Quality & operations

1. **End-to-end tests** — add Playwright covering: offline session creation → reconnect → sync,
   quiz completion → mistake/revision rows, backup export/import.
2. **Linting & formatting** — add ESLint (`typescript-eslint`, `react-hooks`) and Prettier, then
   wire into CI. No linter config exists today.
3. **Accessibility pass** — keyboard traps in modals, focus rings, `aria-live` for the timer and
   sync pill; run axe on every route.
4. **Conflict strategy** — current sync is last-write-wins per record. If multi-device use is ever
   needed, add `updatedAt`-based rejection and a merge UI.
5. **Deployment configuration** — replace `database_id = "local"` in `packages/api/wrangler.toml`
   with the real D1 id; optionally restrict CORS using a `FRONTEND_URL` var once the Pages URL is
   fixed.
6. **Backup automation** — a scheduled GitHub Action calling `GET /api/v1/backup/export` and
   committing an encrypted artifact (still ₹0 on free tiers).

---

## 3. Architecture Notes for Contributors

- **Local-first writes**: `storage.*` writes to IndexedDB and enqueues a mutation; `apiClient`
  must not also POST directly (that caused duplicate rows before v1.1.0).
- **Atomic submissions**: practice tests + attempts go through one queued `submit_test` mutation.
- **Client IDs**: the API honours `body.id` for sessions, goals, notes and bookmarks. Keep this
  behaviour when adding endpoints so replays stay idempotent.
- **Schema changes**: `0001_initial_schema.sql` is canonical for fresh databases. Every change to
  an existing database needs a new idempotent migration (see `0003_integrity_indexes.sql`); SQLite
  cannot add CHECK constraints in place.
- **Mappers**: D1 rows are `snake_case`; domain objects are `camelCase`. Always route through
  `packages/api/src/db/mappers.ts`.

See [`docs/OFFLINE_SYNC.md`](./docs/OFFLINE_SYNC.md) and [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## 4. How to Pick Up the Next Item

1. Read `AGENTS.md` guardrails (₹0 stack, no paid dependencies, offline fallback).
2. Run `npm run verify` to confirm a clean baseline.
3. Implement the change with production-ready code (no placeholders).
4. Update `README.md`, this file, `CHANGELOG.md`, and `AGENTS.md` when behaviour changes.
5. Re-run `npm run verify` before handing off.

---

## 5. Acceptance Criteria (v1.1.0)

- [x] Schedule targets, log sessions, record questions/time, plan tomorrow.
- [x] Dashboard surfaces plan, completed time, due revisions, focus timer, weekly consistency.
- [x] TypeScript and Vite PWA build cleanly (`npm run typecheck`, `npm run build`).
- [x] Relational D1 schema with FKs, JSON checks, indexes, and full JSON backup/restore.
- [x] Import question packs with row-level validation errors; browse/filter by exam/year/subject.
- [x] Configure and complete timed or untimed quizzes; record answers and analytics.
- [x] Incorrect answers generate classified mistakes feeding the spaced-repetition queue.
- [x] Weak-area diagnosis enforces the 15-attempt sample guard and remembers dismissals.
- [x] Markdown notebook with KaTeX, dated current affairs, and global offline search.
- [x] Offline mutation queue flushes reliably and surfaces status to the user.
- [x] Installable PWA with icons, offline deep links, security headers and CI.
- [x] ₹0 monthly operating cost on Cloudflare Pages, Workers and D1 free tiers.
