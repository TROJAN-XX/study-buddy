# AGENTS.md — AI Agent Collaboration & Development Guide

> **Operational Playbook for AI Agents & Subagents working on `study_buddy`**  
> *Targeted at autonomous pair programmers, subagents, and LLM coding assistants.*

---

## 1. Project Mission & Core Rules

`study_buddy` is a private, zero-cost (₹0 ongoing cost), mobile-first study platform for a single individual preparing for Indian competitive examinations:
- **Exams**: SSC CGL, TNPSC Group 4, TNPSC Group 2 & 2A, IBPS (PO, Clerk, SO), SBI (PO, Clerk).
- **Core Loop**: `Plan → Learn → Practice → Review → Repeat`.
- **Operating Cost Target**: Strict **₹0** via Cloudflare Pages (Free), Cloudflare Workers (Free), and Cloudflare D1 (Free).
- **Aesthetic**: Calm, luxury dark charcoal (`#0a0a0a`, `#141414`), white/warm-gray text, electric sapphire accent (`#6b8afd`), zero noisy gamification or stress-inducing streak loss.

---

## 2. Agent Guardrails & Technical Constraints

### Inviolable Commandments
1. **Never introduce paid dependencies**: No paid APIs, no OpenAI/Claude API keys required for runtime, no paid databases, no paid authentication (Clerk, Auth0). Single-user access is secured via `Authorization: Bearer <API_TOKEN>` header.
2. **Preserve working conventions**: Do not rewrite or replace existing modules without explicit reason. Build incrementally upon existing foundations.
3. **No placeholders or mock-only code**: When implementing features, write full, production-ready TypeScript code with realistic error handling and data persistence.
4. **Offline-first fallback**: The frontend must continue functioning standalone via `storage.ts` (LocalStorage/IndexedDB) even when the Cloudflare Worker API is unreachable.
5. **Preserve documentation integrity**: Always keep `README.md`, `PENDING_WORK.md`, and this `AGENTS.md` up to date when delivering milestones.

---

## 3. Monorepo Architecture & Path Map

```
study-buddy/
├── shared/                       # Shared package (@study-buddy/shared)
│   ├── src/types.ts              # Universal TypeScript domain interfaces & API response shapes
│   └── src/seed-data.ts          # Default Indian exams, 6 subjects, 45+ hierarchical topics
├── packages/api/                 # Cloudflare Worker API (@study-buddy/api)
│   ├── src/index.ts              # Hono application root with CORS, auth, and routing
│   ├── src/middleware/auth.ts    # Bearer token validation against env.API_TOKEN
│   ├── src/db/migrations/        # D1 SQLite schema (0001_initial_schema.sql, 0002_seed_data.sql, 0003_integrity_indexes.sql)
│   ├── src/db/mappers.ts         # DB snake_case ↔ Domain camelCase bidirectional mappers
│   ├── src/validation/schemas.ts # Zod runtime request validators
│   └── src/routes/               # Hono route handlers (dashboard, sessions, goals, practice, bookmarks, backup...)
├── tests/                        # Vitest unit suite (question packs, API schemas, utilities)
└── packages/web/                 # React 18 PWA (@study-buddy/web)
    ├── vite.config.ts            # Vite + VitePWA + Path Aliases
    ├── tailwind.config.js        # Charcoal palette (#0a0a0a, #141414, #1a1a1a, #6b8afd)
    ├── src/main.tsx              # App entry, ErrorBoundary & background sync bootstrap
    ├── src/App.tsx               # Top-level route switch (includes /search and 404)
    ├── src/components/           # Layout, Sidebar, BottomNav, Markdown (KaTeX), NetworkStatus, ErrorBoundary
    ├── src/lib/storage.ts        # IndexedDB repository + offline mutation queue + localStorage fallback
    ├── src/lib/http.ts           # API base URL, Bearer auth, typed success/failure results
    ├── src/lib/sync.ts           # Queue processor (startup / online / 30s flush)
    ├── src/lib/api.ts            # Local-first API client with remote read-through
    └── src/features/             # Feature slices: dashboard, tracker, goals, practice, library, search...
```

---

## 4. Environment & Tooling Guardrails (Windows / PowerShell)

When executing terminal commands or builds in this environment, follow these proven configurations:

### 1. Terminal / Shell Rules
- **OS**: Windows, PowerShell.
- **NEVER propose `cd` commands**: Always use the explicit `Cwd` parameter on tool calls.
- **Do not use Unix-specific commands**: Avoid `grep`, `head -50`, `cat` (use PowerShell cmdlets like `Select-Object -First 50` or direct file view tools).

### 2. Workspace Temp Directory (EPERM Fix)
When building the web PWA (`npm run build`), `workbox-build` uses `tempy` which writes temporary files to the system `%TEMP%`. In sandboxed Windows environments, this can trigger an `EPERM` error if it looks outside the workspace.
- **Solution already configured in `vite.config.ts`**: The configuration automatically sets `process.env.TEMP` and `process.env.TMP` to `<workspace>/.temp/`. Ensure `.temp/` is preserved in `.gitignore`.

### 3. Native Dependencies Approval (`allowScripts`)
In root `package.json`, native packages (`esbuild`, `workerd`, `sharp`) are whitelisted under `allowScripts`. If you add any native binaries, approve them via `npm install-scripts approve <pkg>`.

---

## 5. Development Workflow & Verification Protocols

Before completing any task or ending a turn, you **MUST** run the verification suite:

```bash
# 1. Verify TypeScript compiles across shared, api, and web packages
npm run typecheck

# 2. Run the Vitest unit suite
npm test

# 3. Verify that the production PWA and Service Worker build cleanly
npm run build
```

`npm run verify` runs all three in sequence. All commands must exit with code 0. If any TypeScript
errors, failing tests, or Vite bundler warnings appear, resolve them before notifying the user.

---

## 6. How to Continue Work on Pending Phases

Refer to [`PENDING_WORK.md`](./PENDING_WORK.md) for the detailed backlog. When picking up a new phase:

### Implementing New Work
`PENDING_WORK.md` is the single source of truth for what remains. Phases 1–5 and the v1.1.0
hardening release are complete; the remaining backlog is product refinements (note↔question
linking, revision endpoint parity) and quality work (E2E tests, linting, accessibility).

### Data & Sync Rules (non-negotiable)

1. **Local-first writes**: all mutations go through `storage.create/update/remove`, which persist to
   IndexedDB *and* enqueue a `SyncMutation`. Never add a second direct `POST`/`PUT`/`DELETE` in
   `apiClient` for the same change — that causes duplicate server rows.
2. **Queue acknowledgements**: entries are removed only after a successful `{ success: true }`
   response. `flushSyncQueue()` stops at the first failure to preserve ordering.
3. **Idempotency**: the client generates UUIDs and the API must honour `body.id` for create
   endpoints (sessions, goals, notes, bookmarks). Keep this when adding routes.
4. **Atomic submissions**: practice tests and attempts are sent together via the queued
   `submit_test` mutation to `/practice/tests/submit`; the server derives mistake/revision rows.
5. **Bulk writes**: `storage.setAll()` deliberately does not queue — use it only for flows that
   own a dedicated bulk endpoint (backup restore, carry-forward, reschedule, test submission).
6. **Reads**: remote-first with local fallback (`requestApi` returns `null` on any failure). The app
   must remain fully functional with `VITE_API_URL` unset.
7. **Schema changes**: `0001_initial_schema.sql` is canonical for fresh databases. Existing
   databases need a new idempotent migration (`0003_integrity_indexes.sql` is the template).
   SQLite cannot add CHECK constraints in place — use `CREATE ... INDEX IF NOT EXISTS` or a
   table-rebuild migration.
8. **Markdown & math**: render user content with `components/Markdown.tsx` (KaTeX, `trust: false`,
   raw HTML neutralised). Never inject note/question text with `dangerouslySetInnerHTML` directly.


---

## 7. Code Conventions & Style Guide

- **Components**: Functional React components with TypeScript props interfaces. Use named exports:
  ```tsx
  export const MyComponent: React.FC<MyComponentProps> = ({ ... }) => { ... };
  ```
- **Styling**: Tailwind CSS utility classes strictly following dark charcoal tokens:
  - Surface: `bg-surface` (`#0a0a0a`), `bg-surface-card` (`#141414`), `bg-surface-elevated` (`#1a1a1a`).
  - Text: `text-text` (`#f0f0f0`), `text-text-secondary` (`#a0a0a0`), `text-text-muted` (`#707070`).
  - Accent: `bg-accent` (`#6b8afd`), `text-accent`, `border-accent/40`.
- **Icons**: Always import from `lucide-react`.
- **Database**:
  - D1 SQLite table columns are `snake_case`.
  - TypeScript models are `camelCase`.
  - Always use `packages/api/src/db/mappers.ts` for database row transformations.
  - JSON columns (options, tags, config) are stored as stringified JSON and parsed via `safeJsonParse()`.
