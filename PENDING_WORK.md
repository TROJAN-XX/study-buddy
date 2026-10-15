# Study Buddy: Pending Work & Roadmap

> **Comprehensive Backlog & Implementation Blueprint for Phases 2 through 5**  
> *Derived from the master prompt specifications, domain requirements, and system architecture.*

---

## 1. Project Phase Tracker

| Phase | Milestone Name | Scope Summary | Status |
|---|---|---|---|
| **Phase 1** | **Foundation & Daily Study Loop** | PWA shell, dark luxury design system, Today dashboard, daily session tracker, goal management with carry-forward, focus sprint timer, 12-table D1 schema, and backup baseline. | **COMPLETED** |
| **Phase 2** | **Question Library & Practice Engine** | JSON question pack importer, schema validation with row errors, searchable question bank, bookmarks, topic practice, and timed quiz engine. | **COMPLETED** |
| **Phase 3** | **Mistake Book & Mock Analysis** | Sectional & full mock tests, error categorization (concept gap, calculation, misread, guess, time pressure), post-test diagnostic summary. | **PENDING** (Next) |
| **Phase 4** | **Revision Scheduler & Diagnosis** | Modified SM-2 spaced repetition queue, due-today review loop, topic weakness diagnosis with sample-size safeguards. | **PENDING** |
| **Phase 5** | **Study Library & Production Polish** | Formula & concept notebook (Markdown), dated current affairs collections, global search, and final offline sync hardening. | **PENDING** |

---

## 2. Phase 2: Question Library & Practice Engine *(Immediate Next Milestone)*

### Module 2.1: JSON Question Pack Importer & Validator
- **Requirement**: Allow the learner to author questions in clean JSON (cleaned from PDFs) and import packs without duplicates or schema corruption.
- **Components to Build**:
  - `packages/web/src/features/library/PackImporterModal.tsx`: Drag-and-drop JSON file upload or raw JSON text paste.
  - `packages/api/src/validation/question-pack.ts`: Server-side and client-side Zod validator verifying:
    - Unique question IDs (e.g., `ssc-cgl-2024-quant-0001`).
    - Valid exam enums (SSC CGL, TNPSC Group 4, TNPSC Group 2/2A, IBPS PO/Clerk/SO, SBI PO/Clerk).
    - Single-choice vs multi-choice option arrays (`id`, `text`).
    - Answer consistency (answers must exist in the options list).
    - Source metadata (`name`, `reference`, `verification_status`).
  - **Duplicate Handling**: Option to "Skip existing", "Overwrite existing", or "Abort on conflict".
  - **Row-level Error Reporting**: Render a detailed tabular error log showing exact record index, field path, and actionable explanation if validation fails.

### Module 2.2: Question Bank Browser & Search
- **Requirement**: Search and filter thousands of previous-year and practice questions with indexed performance.
- **Components to Build**:
  - `packages/web/src/features/library/QuestionList.tsx`: Virtualized or paginated list of questions.
  - Multi-dimensional filters:
    - Exam filter (e.g., SSC CGL, TNPSC Group 4)
    - Year & Shift filter (e.g., 2024 Tier I, Shift 2)
    - Subject & Topic dropdowns (cascading from shared taxonomy)
    - Difficulty pill toggle (Easy, Medium, Hard)
    - Verification status badge (Verified, Unverified, Disputed)
  - Full-text question search (instant debounced filtering across question text and tags).
  - One-click bookmark toggle per question.

### Module 2.3: Topic Practice & Timed Quiz Runner
- **Requirement**: Take untimed or timed quizzes by topic or mixed sections with instant answer reveals or end-of-test submissions.
- **Components to Build**:
  - `packages/web/src/features/practice/QuizConfigModal.tsx`: Configure:
    - Target subject & topic(s)
    - Question count (5, 10, 20, 25, 50)
    - Mode: *Practice Mode* (instant explanation after each answer) vs *Exam Mode* (timed, answers hidden until final submission)
    - Optional timer (e.g., 60 seconds per question or fixed test duration).
  - `packages/web/src/features/practice/QuizRunner.tsx`:
    - Full-screen focused test interface.
    - Question palette on sidebar / drawer for jumping between questions.
    - Option selection with keyboard shortcuts (A, B, C, D, or 1, 2, 3, 4).
    - "Mark for Review" and "Mark as Uncertain" toggles.
    - Clean KaTeX LaTeX rendering for quantitative math equations.
    - Save attempt to `practice_attempts` in D1 / LocalStorage upon completion.

---

## 3. Phase 3: Mistake Book & Mock Analysis

### Module 3.1: Post-Test Diagnostic Review
- **Requirement**: After completing any quiz or mock test, provide an honest, actionable performance summary without false confidence.
- **Components to Build**:
  - `packages/web/src/features/practice/TestResultSummary.tsx`:
    - Score overview: Total attempted, Correct, Incorrect, Skipped, Accuracy %.
    - Time analysis: Average seconds per question, pace distribution across sections.
    - Section-wise accuracy breakdown table.
    - Immediate "Add all incorrect to Revision Queue" action.

### Module 3.2: Mistake Classification & Error Tagging
- **Requirement**: Every wrong answer must be classified by root cause to prevent recurring mistakes.
- **Components to Build**:
  - `packages/web/src/features/revision/MistakeClassificationModal.tsx`:
    - Root-cause error categories:
      1. `concept_gap` (Learner did not know or forgot the underlying concept)
      2. `calculation_error` (Understood method, made arithmetic slip)
      3. `misread_question` (Missed "NOT", units misread, hasty read)
      4. `guessed_answer` (Uncertain hunch, low confidence)
      5. `time_pressure` (Rushed due to running out of time)
      6. `other` (Custom notes)
    - Personal reflection note field per mistake.
    - Bidirectional link to create or view a concept note in the Formula Notebook.

---

## 4. Phase 4: Revision Scheduler & Weak-Area Diagnosis

### Module 4.1: Spaced Repetition Engine (SM-2 Modified)
- **Requirement**: Ensure incorrect and uncertain items resurface automatically at mathematically spaced intervals (1, 3, 7, 14, 30 days) until mastered.
- **Components to Build**:
  - `packages/web/src/features/revision/RevisionQueue.tsx`:
    - Filterable queue of due items: *Due Today*, *Upcoming*, *Mastered*, *Suspended*.
    - Non-punitive backlog handling: "Catch up on high priority", "Defer remaining", or "Reschedule evenly over 3 days".
  - Flashcard-style recall review modal with 3 evaluation grades:
    - *Easy* (Increase interval: next review in $interval \times 2.5$ days)
    - *Difficult* (Short interval: review in 2 days)
    - *Forgot* (Reset interval to 1 day; flag concept gap)

### Module 4.2: Weak-Area Diagnosis with Sample-Size Safeguards
- **Requirement**: Diagnose real topic weaknesses while strictly avoiding false alerts based on 1 or 2 lucky or unlucky attempts.
- **Components to Build**:
  - `packages/web/src/features/progress/WeakAreaDiagnosis.tsx`:
    - **Minimum Sample Guard**: Requires at least 15 attempts on a topic before issuing a high-confidence diagnosis. If $attempts < 15$, display label: *"Insufficient sample size (X / 15 questions attempted)"*.
    - **Quadrant Classification**:
      - *Concept Deficiency*: Low Accuracy (< 55%), Normal/Slow Pace. Action: Concept review in Notebook.
      - *Pace Deficiency*: High Accuracy (> 80%), Slow Pace (> 90s/Q). Action: Timed sprint drills.
      - *High Mastery*: High Accuracy (> 85%), Fast Pace. Action: Scheduled maintenance revision.
      - *Low Practice Volume*: High Accuracy or Low Accuracy with low sample count. Action: Practice 20 more questions.
    - Dismiss or override toggle allowing the user to mark a recommendation as resolved.

---

## 5. Phase 5: Study Notebook, Current Affairs & Polish

### Module 5.1: Formula & Concept Notebook
- **Requirement**: Centralized markdown notebook for formulas, mnemonics, shortcuts, and vocabulary.
- **Components to Build**:
  - `packages/web/src/features/library/Notebook.tsx`:
    - Categorized by Subject, Topic, and Note Type (`concept`, `formula`, `shortcut`, `vocabulary`, `fact`).
    - Markdown editor with live preview and KaTeX math formatting ($\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$).
    - One-click copy for formulas and shortcut tricks.
    - Global search across all notes.

### Module 5.2: Dated Current Affairs & Daily Compilations
- **Requirement**: Track time-sensitive national, Tamil Nadu, and economic events with verification status and quiz integration.
- **Components to Build**:
  - `packages/web/src/features/library/CurrentAffairsFeed.tsx`:
    - Prominently displays event date (day, month, year).
    - Categorized tags: *Tamil Nadu*, *National*, *Banking & Economy*, *Science & Tech*, *Awards & Sports*.
    - Source name and verification status.
    - "Generate Quick Quiz from this Month" button to test recall immediately.

### Module 5.3: Offline Queue & Sync Hardening
- **Requirement**: Queue mutations (new sessions, answers, notes) when offline and execute atomic background synchronization when connection restores.
- **Tasks**:
  - Implement IndexedDB offline mutation queue (`sync_queue`).
  - Listen for `navigator.onLine` and `window.addEventListener('online')`.
  - Batch flush queued changes to Cloudflare Worker `/api/backup/import` or individual endpoints with conflict resolution.

---

## 6. Acceptance Criteria Checklist for Full Product Completion

- [x] **Criterion 1**: Learner can schedule targets, log study sessions with subject/topic, record questions/time, and plan tomorrow.
- [x] **Criterion 2**: Dashboard surfaces today's plan, completed time, due revision count, focus timer, and weekly consistency without gamified streaks.
- [x] **Criterion 3**: Application runs locally and compiles cleanly with TypeScript and Vite PWA shell.
- [x] **Criterion 4**: 12-table relational D1 schema with migrations, indexes, and full JSON backup/restore exists.
- [ ] **Criterion 5**: Learner can import a JSON question pack, receive row-level error validation, and browse items by exam/year/subject.
- [ ] **Criterion 6**: Learner can configure and complete a timed or untimed quiz, record answers, and view score/time analytics.
- [ ] **Criterion 7**: Incorrect answers generate classified mistakes that feed directly into the spaced repetition queue.
- [ ] **Criterion 8**: Weak-area diagnosis requires minimum attempt threshold before labeling weak concepts or slow pace.
- [ ] **Criterion 9**: Markdown notebook with formula rendering and dated current affairs feed is searchable and filterable.
- [ ] **Criterion 10**: Complete deployment at ₹0 monthly operating cost verified on Cloudflare Pages, Workers, and D1.
