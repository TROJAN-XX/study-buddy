// ─── Exam & Taxonomy ───────────────────────────────────────────

export interface Exam {
  id: string;
  name: string;
  fullName: string;
  date?: string | null;       // ISO date or null if unknown
  priority: number;           // 1 = highest
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  category: string;
  icon?: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  parentTopicId?: string | null;
}

// ─── Study Sessions & Daily Tracker ────────────────────────────

export type Confidence = 'low' | 'medium' | 'high';

export interface StudySession {
  id: string;
  date: string;              // YYYY-MM-DD
  examId?: string | null;
  subject: string;
  topic: string;
  durationMinutes: number;
  questionsAttempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  confidence: Confidence;
  reflection?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GoalStatus = 'planned' | 'in_progress' | 'completed' | 'deferred' | 'overdue';
export type GoalPriority = 'low' | 'medium' | 'high';

export interface DailyGoal {
  id: string;
  date: string;              // YYYY-MM-DD
  subject: string;
  topic: string;
  targetDescription: string;
  targetQuantity?: number | null;
  targetDurationMinutes?: number | null;
  priority: GoalPriority;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Questions ─────────────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'single_choice' | 'multi_choice' | 'true_false' | 'fill_blank';
export type VerificationStatus = 'verified' | 'unverified' | 'disputed';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionSource {
  name: string;
  reference?: string;
}

export interface Question {
  id: string;
  exam: string;
  year?: number | null;
  paper?: string | null;
  shift?: string | null;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  questionType: QuestionType;
  questionText: string;
  options: QuestionOption[];
  answer: string[];
  explanation?: string | null;
  source?: QuestionSource | null;
  verificationStatus: VerificationStatus;
  tags: string[];
  packId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Practice Tests & Attempts ─────────────────────────────────

export type TestType = 'topic_wise' | 'mixed' | 'sectional' | 'full_mock';
export type TestStatus = 'in_progress' | 'completed' | 'abandoned';
export type MarkedStatus = 'none' | 'review' | 'uncertain';

export interface PracticeTest {
  id: string;
  title: string;
  exam?: string | null;
  type: TestType;
  config: {
    subjects?: string[];
    topics?: string[];
    difficulty?: Difficulty[];
    questionCount: number;
  };
  timeLimitMinutes?: number | null;
  status: TestStatus;
  score?: number | null;
  total?: number | null;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
}

export interface PracticeAttempt {
  id: string;
  testId: string;
  questionId: string;
  selectedAnswer: string[];
  isCorrect: boolean;
  timeSeconds?: number | null;
  markedStatus: MarkedStatus;
  createdAt: string;
}

// ─── Mistakes & Revision ───────────────────────────────────────

export type ErrorType =
  | 'concept_gap'
  | 'calculation_error'
  | 'misread_question'
  | 'guessed_answer'
  | 'time_pressure'
  | 'other';

export type RevisionStatus = 'pending' | 'reviewed' | 'mastered' | 'suspended';

export interface Mistake {
  id: string;
  questionId: string;
  attemptId: string;
  errorType: ErrorType;
  notes?: string | null;
  revisionStatus: RevisionStatus;
  nextReviewDate?: string | null;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RevisionItem {
  id: string;
  sourceType: 'mistake' | 'topic' | 'note';
  sourceId: string;
  topic?: string | null;
  subject?: string | null;
  nextReview: string;        // YYYY-MM-DD
  intervalDays: number;
  easeFactor: number;        // SM-2 style, default 2.5
  status: RevisionStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Notes ─────────────────────────────────────────────────────

export type NoteType = 'concept' | 'formula' | 'shortcut' | 'vocabulary' | 'fact' | 'reminder' | 'current_affairs';

export interface Note {
  id: string;
  title: string;
  content: string;           // Markdown
  subject?: string | null;
  topic?: string | null;
  tags: string[];
  type: NoteType;
  examRelevance?: string[];
  sourceUrl?: string | null;
  sourceName?: string | null;
  eventDate?: string | null;  // For current affairs
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Bookmarks ─────────────────────────────────────────────────

export type BookmarkTargetType = 'question' | 'note' | 'topic';

export interface Bookmark {
  id: string;
  targetType: BookmarkTargetType;
  targetId: string;
  createdAt: string;
}

// ─── Dashboard & Aggregates ────────────────────────────────────

export interface DashboardData {
  today: string;
  todayGoals: DailyGoal[];
  todaySessions: StudySession[];
  dueRevisionCount: number;
  recentTestResult?: {
    testId: string;
    title: string;
    score: number;
    total: number;
    completedAt: string;
  } | null;
  weeklyStats: {
    totalMinutes: number;
    totalQuestions: number;
    daysStudied: number;
    accuracy: number | null;
  };
  motivationalQuote?: string | null;
}

// ─── API Types ─────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string; row?: number }>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

// ─── Export / Backup ───────────────────────────────────────────

export interface BackupData {
  version: string;
  exportedAt: string;
  exams: Exam[];
  sessions: StudySession[];
  goals: DailyGoal[];
  questions: Question[];
  tests: PracticeTest[];
  attempts: PracticeAttempt[];
  mistakes: Mistake[];
  revisionItems: RevisionItem[];
  notes: Note[];
  bookmarks: Bookmark[];
}
