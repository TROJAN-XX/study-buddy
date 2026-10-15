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
│   ├── src/db/migrations/        # D1 SQLite schema (0001_initial_schema.sql, 0002_seed_data.sql)
│   ├── src/db/mappers.ts         # DB snake_case ↔ Domain camelCase bidirectional mappers
│   ├── src/validation/schemas.ts # Zod runtime request validators
│   └── src/routes/               # Hono route handlers (dashboard, sessions, goals, backup...)
└── packages/web/                 # React 18 PWA (@study-buddy/web)
    ├── vite.config.ts            # Vite + VitePWA + Path Aliases
    ├── tailwind.config.js        # Charcoal palette (#0a0a0a, #141414, #1a1a1a, #6b8afd)
    ├── src/main.tsx              # App entry & service worker registration
    ├── src/App.tsx               # Top-level route switch
    ├── src/components/           # Layout, Sidebar, BottomNav, and atomic UI components
    ├── src/lib/storage.ts        # Offline LocalStorage CRUD repository
    ├── src/lib/api.ts            # Unified API client with automatic offline fallback
    └── src/features/             # Feature slices: dashboard, tracker, goals, practice, library...
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

# 2. Verify that the production PWA and Service Worker build cleanly
npm run build
```

Both commands must exit with code 0. If any TypeScript errors or Vite bundler warnings appear, resolve them before notifying the user.

---

## 6. How to Continue Work on Pending Phases

Refer to [`PENDING_WORK.md`](./PENDING_WORK.md) for the detailed backlog. When picking up a new phase:

### Implementing Phase 2: Question Library & Practice Engine
1. **JSON Question Pack Validator**:
   - Inspect the example schema in the original prompt (`question_json_schema_example`).
   - Create Zod schema in `packages/api/src/validation/question-pack.ts` or `shared/src/schemas.ts`.
   - Implement row-level error reporting (return `errors: [{ row: 12, field: 'answer', message: '...' }]`).
2. **Question Library UI**:
   - Implement `packages/web/src/features/library/LibraryPage.tsx`.
   - Add pack import modal with drag-and-drop JSON file upload.
   - Add search input and multi-select filters for Exam, Year, Subject, Topic, and Difficulty.
3. **Practice Runner**:
   - Replace placeholder in `packages/web/src/features/practice/PracticePage.tsx`.
   - Build `QuizConfigModal` (question count, subjects, timed vs untimed).
   - Build `QuizRunner` with keyboard navigation, option select, and review marking.
   - Record completed attempts into `practice_attempts` and `practice_tests`.

### Implementing Phase 3: Mistake Book & Mock Analysis
1. Post-test results screen with sectional breakdown and time pace.
2. Error classifier modal (`concept_gap`, `calculation_error`, `misread_question`, `guessed_answer`, `time_pressure`).
3. Store mistakes into `mistakes` table/collection and link to revision items.

### Implementing Phase 4: Revision Scheduler & Weak-Area Diagnosis
1. Spaced repetition queue using modified SM-2 algorithm (1, 3, 7, 14 days interval).
2. Diagnostic engine with **minimum 15-attempt sample size safeguard** before labeling a topic weak.

### Implementing Phase 5: Study Notebook, Current Affairs & Polish
1. Markdown formula and concept notebook with KaTeX support.
2. Chronological current affairs feed with date filtering and quick recall quizzes.

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
