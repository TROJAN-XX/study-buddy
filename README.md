# Study Buddy (`study_buddy`)

> **Personal Competitive Exam Preparation Platform**  
> *A private, mobile-friendly preparation hub for SSC CGL, TNPSC Group 4 & 2/2A, IBPS (PO/Clerk/SO), and SBI (PO/Clerk).*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Hono](https://img.shields.io/badge/Hono-4.6-E36002.svg)](https://hono.dev/)
[![Cloudflare Workers & D1](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20D1-F38020.svg)](https://workers.cloudflare.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Installable%20Offline-green.svg)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/Cost-%E2%82%B90%20(Free%20Tier)-emerald.svg)](#zero-cost-operating-model)

---

## 1. Executive Summary & Product Vision

**Study Buddy** is an offline-first, mobile-first personal study operating system engineered for single-learner mastery of Indian national and Tamil Nadu state competitive examinations.

Competitive exam preparation in India is often derailed by cognitive overload, fragmented notes, chaotic revision cycles, and punitive streak counters. Study Buddy replaces stress with a calm, high-contrast, luxury-inspired study rhythm built around a 4-stage continuous learning loop:

```mermaid
flowchart LR
    A["01 · PLAN<br/>Target Exams → Weekly Priorities → Today's Goals"] --> B["02 · LEARN<br/>Concept Notes · Formulas · Daily Current Affairs"]
    B --> C["03 · PRACTICE<br/>Topic Drills · PYQ Packs · Timed Sectional Mocks"]
    C --> D["04 · REVIEW<br/>Error Taxonomy · Spaced Repetition · Weakness Diagnosis"]
    D --> A
```

---

## 2. System Architecture

Study Buddy uses a modern, ultra-lightweight TypeScript monorepo designed to operate indefinitely at **₹0 ongoing cost** on Cloudflare's global edge network.

```mermaid
flowchart TB
    subgraph Client["Frontend · Cloudflare Pages (Free Tier)"]
        UI["React 18 PWA (Vite + Tailwind CSS)"]
        SW["Service Worker (Workbox precaching)"]
        IDB["Offline Storage Layer (IndexedDB / LocalStorage)"]
        UI <--> SW
        UI <--> IDB
    end

    subgraph Edge["API Layer · Cloudflare Worker (Free Tier)"]
        Hono["Hono v4 Router (14KB Edge Runtime)"]
        Auth["Bearer Token Auth Middleware"]
        Val["Zod Validation & Sanitization"]
        Hono --> Auth --> Val
    end

    subgraph Storage["Database · Cloudflare D1 (Free Tier SQLite)"]
        D1[("Cloudflare D1 SQLite Database<br/>12 Tables · Automated Migrations · Indexed")]
    end

    UI -->|"HTTPS + Bearer Auth (Online)"| Hono
    Val -->|"D1 Prepared Statements"| D1
    UI -.->|"Offline Fallback Mode"| IDB
```

### Core Design Decisions

| Layer | Technology | Key Reason | Free Tier Quota / Benefit |
|---|---|---|---|
| **Monorepo** | npm workspaces | Zero tooling overhead, unified types across client & server | Built-in Node.js capability |
| **Frontend** | React 18 + Vite 5 + Tailwind 3 | Instant HMR, minimal bundle size (80KB gzipped), tree-shakeable | Unlimited bandwidth & requests on Cloudflare Pages |
| **PWA Engine** | Vite Plugin PWA + Workbox | Full installability, offline shell caching, background resilience | Operates completely without internet connection |
| **Backend API** | Hono v4 on Cloudflare Workers | Edge execution, sub-10ms cold starts, zero dependency bloat | 100,000 requests/day free, 10ms CPU per request |
| **Database** | Cloudflare D1 (Serverless SQLite) | Direct SQL relational capabilities, transaction safety | 5 GB storage, 5,000,000 row reads/day, 100,000 writes/day |
| **Auth** | Bearer Secret Header | Private single-user access without requiring paid Auth0/Clerk | ₹0 cost, zero tracking cookies |

---

## 3. Repository Structure

```
study-buddy/
├── package.json                   # Monorepo root workspace config & scripts
├── tsconfig.json                  # Root TypeScript configuration
├── AGENTS.md                      # AI & Agent pairing guidelines and protocol
├── PENDING_WORK.md                # Comprehensive backlog of Phases 2 through 5
├── docs/
│   └── ARCHITECTURE.md            # Deep-dive architecture, ER diagrams, data flow
├── shared/                        # Shared TypeScript schemas, types, and seed data
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts               # Barrel exports
│       ├── types.ts               # Universal domain models & API response interfaces
│       └── seed-data.ts           # Exams, subjects, and 45+ hierarchical topics
└── packages/
    ├── api/                       # Cloudflare Workers Edge API (Hono)
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── wrangler.toml          # Cloudflare Worker & D1 binding configuration
    │   └── src/
    │       ├── index.ts           # App entry point, CORS, error handling, route mounting
    │       ├── types.ts           # Worker environment bindings
    │       ├── middleware/
    │       │   └── auth.ts        # Bearer token security check
    │       ├── db/
    │       │   ├── mappers.ts     # Snake_case DB to camelCase model mappers
    │       │   └── migrations/
    │       │       ├── 0001_initial_schema.sql  # 12 core relational tables & indexes
    │       │       └── 0002_seed_data.sql       # Seed data for exams and taxonomy
    │       ├── validation/
    │       │   └── schemas.ts     # Zod runtime validators
    │       └── routes/
    │           ├── dashboard.ts   # GET /api/dashboard aggregate payload
    │           ├── sessions.ts    # CRUD /api/sessions (daily logs)
    │           ├── goals.ts       # CRUD /api/goals & /carry-forward
    │           ├── exams.ts       # Target exam priority and date management
    │           ├── taxonomy.ts    # Subjects and topics lookup
    │           └── backup.ts      # Full JSON database export and restore
    └── web/                       # React 18 Progressive Web App
        ├── package.json
        ├── tsconfig.json
        ├── vite.config.ts         # Vite build config, path aliases & PWA generator
        ├── tailwind.config.js     # Dark luxury palette & typographic scale
        ├── index.html             # HTML5 app shell
        ├── public/
        │   ├── manifest.json      # PWA install specification
        │   └── favicon.svg        # SVG app icon
        └── src/
            ├── main.tsx           # React DOM root and Service Worker registration
            ├── App.tsx            # Application routing (React Router v6)
            ├── index.css          # Tailwind base directives & custom scrollbars
            ├── components/
            │   ├── Layout.tsx     # Responsive desktop sidebar / mobile bottom nav
            │   ├── Sidebar.tsx    # Desktop fixed navigation rail
            │   ├── BottomNav.tsx  # Mobile glassmorphic bottom bar
            │   └── ui/            # Accessible atomic design system
            │       ├── Card.tsx
            │       ├── Button.tsx
            │       ├── Badge.tsx
            │       ├── Input.tsx
            │       ├── Select.tsx
            │       ├── Modal.tsx
            │       └── EmptyState.tsx
            ├── lib/
            │   ├── utils.ts       # Date parsing, duration formatters, id generators
            │   ├── storage.ts     # Offline-first local storage repository
            │   └── api.ts         # HTTP client with automatic fallback
            └── features/
                ├── dashboard/     # Today screen, Daily Plan, Weekly Stats
                │   ├── Dashboard.tsx
                │   ├── FocusTimer.tsx    # 25m Pomodoro with circular SVG & audio chime
                │   └── QuoteDisplay.tsx  # Rotating Tamil wisdom and discipline quotes
                ├── tracker/       # Daily study log (time, accuracy, reflections)
                │   └── StudyTracker.tsx
                ├── goals/         # Today & tomorrow goal setting with carry-forward
                │   └── GoalsPage.tsx
                ├── practice/      # Practice & test engine (Practice Mode vs Timed Exam Mode)
                │   ├── PracticePage.tsx
                │   ├── QuizConfigModal.tsx   # Configurable exams, topics, count, and timer
                │   ├── QuizRunner.tsx        # Keyboard navigation, palette, KaTeX math
                │   └── TestResultSummary.tsx # Sectional breakdown & mistake classifier trigger
                ├── library/       # Question Bank browser & JSON pack importer
                │   ├── LibraryPage.tsx       # Multi-faceted search, exam/topic filters
                │   └── PackImporterModal.tsx # Drag-and-drop JSON pack validator with row errors
                ├── revision/      # Spaced review queue & Mistake Book
                │   ├── RevisionPage.tsx
                │   ├── RevisionQueue.tsx             # SM-2 Flashcard sprint & backlog handling
                │   ├── MistakeBook.tsx               # Root-cause error analytics & filters
                │   └── MistakeClassificationModal.tsx # Error categorization & reflection notes
                ├── progress/      # Consistency visualization & Weak-Area Diagnosis
                │   ├── ProgressPage.tsx
                │   └── WeakAreaDiagnosis.tsx # 15-attempt sample safeguard & quadrant diagnosis
                ├── notes/         # Study Notebook, Formulas & Current Affairs
                │   ├── NotebookPage.tsx      # Formula repository with one-click copy
                │   ├── CurrentAffairsFeed.tsx # Chronological dated news compilations
                │   └── NoteModal.tsx         # Markdown editor with live preview
                └── settings/      # JSON export, file restore, and state reset
                    └── SettingsPage.tsx
```

---

## 4. Visual Design System

The application strictly adheres to a **calm, focused, dark-mode luxury aesthetic**:
- **Background Surfaces**: Pure near-black (`#0a0a0a`), card background (`#141414`), elevated surface (`#1a1a1a`), hover states (`#1e1e1e`), and hairline borders (`#2a2a2a`).
- **Typography & Text**: High-contrast white (`#f0f0f0`), secondary warm gray (`#a0a0a0`), and muted hints (`#707070`).
- **Accent System**: Restrained electric sapphire (`#6b8afd`) with subtle glowing borders (`rgba(107, 138, 253, 0.15)`). No noisy rainbow gradients or dopamine-trap gamification.
- **Responsiveness**:
  - **Desktop (≥ 768px)**: Fixed 64-column left navigation rail, expanded 2-column dashboard layout.
  - **Mobile (< 768px)**: Thumb-friendly top action bar, full-width card layout, and fixed glassmorphic bottom navigation.

---

## 5. Getting Started (Local Development)

### Prerequisites
- **Node.js**: v20.0.0 or higher (Tested on Node.js v26)
- **npm**: v10.0.0 or higher

### 1. Installation
Clone the repository and install workspace dependencies:
```bash
cd study-buddy
npm install
```

### 2. Run Typecheck & Build
Verify that the shared models, API, and web packages build cleanly:
```bash
# Verify TypeScript compilation across all packages
npm run typecheck

# Build the production PWA bundle (including Service Worker)
npm run build
```

### 3. Start Development Servers

#### Launch the Web PWA Frontend:
```bash
npm run dev
# Running at http://localhost:5173
```

#### Launch the Edge API Worker (with local D1 simulation):
```bash
npm run dev:api
# Running at http://localhost:8787
```

---

## 6. Zero-Cost Production Deployment (₹0 / month)

This platform is engineered specifically for a single-person deployment at absolute zero cost.

### Step 1: Initialize Cloudflare D1 Database
Install Wrangler globally or use `npx wrangler`:
```bash
# Log into your free Cloudflare account
npx wrangler login

# Create the remote D1 SQLite database
npx wrangler d1 create study-buddy-db
```
Wrangler will output your unique `database_id`. Paste it into `packages/api/wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "study-buddy-db"
database_id = "YOUR_ACTUAL_D1_DATABASE_ID_HERE"
migrations_dir = "src/db/migrations"
```

### Step 2: Apply Database Migrations
```bash
cd packages/api
npx wrangler d1 migrations apply study-buddy-db --remote
```
This automatically provisions all 12 tables and seeds default Indian competitive exams (SSC CGL, TNPSC Group 4/2, IBPS, SBI) and 45+ syllabus topics.

### Step 3: Configure Single-User API Secret
Set an unguessable token on your Cloudflare Worker:
```bash
npx wrangler secret put API_TOKEN
# Enter a secure passphrase when prompted (e.g., a 32-character random string)
```

### Step 4: Deploy Cloudflare Worker API
```bash
npx wrangler deploy
# Deployed to https://study-buddy-api.<your-cloudflare-subdomain>.workers.dev
```

### Step 5: Deploy Frontend to Cloudflare Pages
Connect your GitHub repository to **Cloudflare Pages** (Free Tier):
- **Framework preset**: `Vite`
- **Root directory**: `packages/web`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Environment variables**:
  - `VITE_API_URL`: `https://study-buddy-api.<your-subdomain>.workers.dev`
  - `VITE_API_TOKEN`: `<your-secure-token>`

Your app will be live on `https://study-buddy.pages.dev` with free SSL and worldwide edge caching.

---

## 7. Data Portability & Privacy

- **Data Sovereignty**: The user owns 100% of their study data. Navigate to **Settings → Backup & Export** to download a single, uncompressed, fully documented `study-buddy-backup.json` file at any time.
- **Independent Restoration**: In the event of an environment wipe or device change, simply click **Import Backup JSON** to restore all sessions, goals, attempts, and notes with automated schema validation.
- **Zero Third-Party Tracking**: No telemetry, no third-party analytics scripts, no external fonts loaded in production, no tracking cookies.

---

## 8. Development Roadmap

For the detailed breakdown of remaining modules and architectural tasks, see [`PENDING_WORK.md`](./PENDING_WORK.md).

- **Phase 1: Foundation & Daily Study Loop** *(Status: Completed)*
  - PWA shell, dark luxury theme, responsive layout.
  - Complete Today dashboard, daily session tracker, goal management with carry-forward, 25m Pomodoro sprint timer.
  - Cloudflare D1 schema (12 tables), Hono edge API, and offline-first LocalStorage fallback.
- **Phase 2: Question Library & Practice Engine** *(Status: Completed)*
  - Schema-validated JSON question pack importer with row-level error reporting.
  - Multi-faceted question bank browser with instant search, filters, and bookmarking.
  - Interactive test runner with Practice Mode (instant explanations) and Timed Exam Mode.
- **Phase 3: Mistake Book & Mock Analysis** *(Status: Pending)*
  - Post-test diagnostic breakdown (score, pace, unanswered items).
  - Categorization of errors (concept gap, calculation, misread, guess, time pressure).
- **Phase 4: Spaced Repetition Revision & Weak-Area Diagnosis** *(Status: Pending)*
  - Modified SM-2 spaced repetition queue (1, 3, 7, 14 days interval).
  - Topic diagnosis with sample size safeguards (minimum attempt threshold).
- **Phase 5: Study Notebook, Current Affairs & Polish** *(Status: Pending)*
  - Markdown concept & formula notebook with bidirectional question linking.
  - Chronological current affairs tracker (national, state, banking, science).
