import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// ─── Study Sessions ──────────────────────────────────────────

export const createSessionSchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format'),
  examId: z.string().nullable().optional(),
  subject: z.string().trim().min(1, 'Subject is required'),
  topic: z.string().trim().min(1, 'Topic is required'),
  durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute'),
  questionsAttempted: z.number().int().min(0, 'Questions attempted must be non-negative').default(0),
  correct: z.number().int().min(0, 'Correct count must be non-negative').default(0),
  incorrect: z.number().int().min(0, 'Incorrect count must be non-negative').default(0),
  skipped: z.number().int().min(0, 'Skipped count must be non-negative').default(0),
  confidence: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Confidence must be low, medium, or high' }),
  }),
  reflection: z.string().nullable().optional(),
});

export const updateSessionSchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format').optional(),
  examId: z.string().nullable().optional(),
  subject: z.string().trim().min(1, 'Subject cannot be empty').optional(),
  topic: z.string().trim().min(1, 'Topic cannot be empty').optional(),
  durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').optional(),
  questionsAttempted: z.number().int().min(0).optional(),
  correct: z.number().int().min(0).optional(),
  incorrect: z.number().int().min(0).optional(),
  skipped: z.number().int().min(0).optional(),
  confidence: z.enum(['low', 'medium', 'high']).optional(),
  reflection: z.string().nullable().optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

// ─── Daily Goals ─────────────────────────────────────────────

export const createGoalSchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format'),
  subject: z.string().trim().min(1, 'Subject is required'),
  topic: z.string().trim().min(1, 'Topic is required'),
  targetDescription: z.string().trim().min(1, 'Target description is required'),
  targetQuantity: z.number().int().min(1, 'Target quantity must be positive').nullable().optional(),
  targetDurationMinutes: z.number().int().min(1, 'Target duration must be positive').nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['planned', 'in_progress', 'completed', 'deferred', 'overdue']).default('planned'),
});

export const updateGoalSchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format').optional(),
  subject: z.string().trim().min(1).optional(),
  topic: z.string().trim().min(1).optional(),
  targetDescription: z.string().trim().min(1).optional(),
  targetQuantity: z.number().int().min(1).nullable().optional(),
  targetDurationMinutes: z.number().int().min(1).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['planned', 'in_progress', 'completed', 'deferred', 'overdue']).optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

// ─── Exams ───────────────────────────────────────────────────

export const updateExamSchema = z.object({
  date: z.string().nullable().optional(),
  priority: z.number().int().min(1, 'Priority must be at least 1').optional(),
  isActive: z.boolean().optional(),
});

export type UpdateExamInput = z.infer<typeof updateExamSchema>;

// ─── Backup Data Import ──────────────────────────────────────

const examBackupSchema = z.object({
  id: z.string(),
  name: z.string(),
  fullName: z.string(),
  date: z.string().nullable().optional(),
  priority: z.number().int().default(1),
  isActive: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const sessionBackupSchema = z.object({
  id: z.string(),
  date: z.string(),
  examId: z.string().nullable().optional(),
  subject: z.string(),
  topic: z.string(),
  durationMinutes: z.number().int().min(0),
  questionsAttempted: z.number().int().default(0),
  correct: z.number().int().default(0),
  incorrect: z.number().int().default(0),
  skipped: z.number().int().default(0),
  confidence: z.enum(['low', 'medium', 'high']),
  reflection: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const goalBackupSchema = z.object({
  id: z.string(),
  date: z.string(),
  subject: z.string(),
  topic: z.string(),
  targetDescription: z.string(),
  targetQuantity: z.number().int().nullable().optional(),
  targetDurationMinutes: z.number().int().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['planned', 'in_progress', 'completed', 'deferred', 'overdue']).default('planned'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const questionBackupSchema = z.object({
  id: z.string(),
  exam: z.string(),
  year: z.number().int().nullable().optional(),
  paper: z.string().nullable().optional(),
  shift: z.string().nullable().optional(),
  subject: z.string(),
  topic: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionType: z.enum(['single_choice', 'multi_choice', 'true_false', 'fill_blank']),
  questionText: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })).default([]),
  answer: z.array(z.string()).default([]),
  explanation: z.string().nullable().optional(),
  source: z.object({ name: z.string(), reference: z.string().optional() }).nullable().optional(),
  verificationStatus: z.enum(['verified', 'unverified', 'disputed']).default('unverified'),
  tags: z.array(z.string()).default([]),
  packId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const testBackupSchema = z.object({
  id: z.string(),
  title: z.string(),
  exam: z.string().nullable().optional(),
  type: z.enum(['topic_wise', 'mixed', 'sectional', 'full_mock']),
  config: z.record(z.any()).default({}),
  timeLimitMinutes: z.number().int().nullable().optional(),
  status: z.enum(['in_progress', 'completed', 'abandoned']).default('in_progress'),
  score: z.number().int().nullable().optional(),
  total: z.number().int().nullable().optional(),
  startedAt: z.string(),
  completedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});

const attemptBackupSchema = z.object({
  id: z.string(),
  testId: z.string(),
  questionId: z.string(),
  selectedAnswer: z.array(z.string()).default([]),
  isCorrect: z.boolean(),
  timeSeconds: z.number().int().nullable().optional(),
  markedStatus: z.enum(['none', 'review', 'uncertain']).default('none'),
  createdAt: z.string().optional(),
});

const mistakeBackupSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  attemptId: z.string(),
  errorType: z.enum([
    'concept_gap',
    'calculation_error',
    'misread_question',
    'guessed_answer',
    'time_pressure',
    'other',
  ]),
  notes: z.string().nullable().optional(),
  revisionStatus: z.enum(['pending', 'reviewed', 'mastered', 'suspended']).default('pending'),
  nextReviewDate: z.string().nullable().optional(),
  reviewCount: z.number().int().default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const revisionItemBackupSchema = z.object({
  id: z.string(),
  sourceType: z.enum(['mistake', 'topic', 'note']),
  sourceId: z.string(),
  topic: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  nextReview: z.string(),
  intervalDays: z.number().int().default(1),
  easeFactor: z.number().default(2.5),
  status: z.enum(['pending', 'reviewed', 'mastered', 'suspended']).default('pending'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const noteBackupSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  subject: z.string().nullable().optional(),
  topic: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  type: z.enum(['concept', 'formula', 'shortcut', 'vocabulary', 'fact', 'reminder', 'current_affairs']),
  examRelevance: z.array(z.string()).optional(),
  sourceUrl: z.string().nullable().optional(),
  sourceName: z.string().nullable().optional(),
  eventDate: z.string().nullable().optional(),
  isBookmarked: z.boolean().default(false),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const bookmarkBackupSchema = z.object({
  id: z.string(),
  targetType: z.enum(['question', 'note', 'topic']),
  targetId: z.string(),
  createdAt: z.string().optional(),
});

export const backupDataSchema = z.object({
  version: z.string().default('1.0.0'),
  exportedAt: z.string().default(() => new Date().toISOString()),
  exams: z.array(examBackupSchema).default([]),
  sessions: z.array(sessionBackupSchema).default([]),
  goals: z.array(goalBackupSchema).default([]),
  questions: z.array(questionBackupSchema).default([]),
  tests: z.array(testBackupSchema).default([]),
  attempts: z.array(attemptBackupSchema).default([]),
  mistakes: z.array(mistakeBackupSchema).default([]),
  revisionItems: z.array(revisionItemBackupSchema).default([]),
  notes: z.array(noteBackupSchema).default([]),
  bookmarks: z.array(bookmarkBackupSchema).default([]),
});

export type BackupDataInput = z.infer<typeof backupDataSchema>;

// ─── Mistakes & Revision ───────────────────────────────────────

export const updateMistakeSchema = z.object({
  errorType: z.enum([
    'concept_gap',
    'calculation_error',
    'misread_question',
    'guessed_answer',
    'time_pressure',
    'other',
  ]).optional(),
  notes: z.string().nullable().optional(),
  revisionStatus: z.enum(['pending', 'reviewed', 'mastered', 'suspended']).optional(),
  nextReviewDate: z.string().nullable().optional(),
  reviewCount: z.number().int().optional(),
});

export type UpdateMistakeInput = z.infer<typeof updateMistakeSchema>;

export const reviewRevisionSchema = z.object({
  grade: z.enum(['easy', 'difficult', 'forgot']),
});

export type ReviewRevisionInput = z.infer<typeof reviewRevisionSchema>;

export const rescheduleRevisionSchema = z.object({
  mode: z.enum(['spread_3_days', 'defer_tomorrow', 'reset']),
});

export type RescheduleRevisionInput = z.infer<typeof rescheduleRevisionSchema>;

// ─── Notes ─────────────────────────────────────────────────────

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  content: z.string().default(''),
  subject: z.string().nullable().optional(),
  topic: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  type: z.enum(['concept', 'formula', 'shortcut', 'vocabulary', 'fact', 'reminder', 'current_affairs']).default('concept'),
  examRelevance: z.array(z.string()).default([]),
  sourceUrl: z.string().nullable().optional(),
  sourceName: z.string().nullable().optional(),
  eventDate: z.string().nullable().optional(),
  isBookmarked: z.boolean().default(false),
});

export const updateNoteSchema = z.object({
  title: z.string().trim().min(1).optional(),
  content: z.string().optional(),
  subject: z.string().nullable().optional(),
  topic: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  type: z.enum(['concept', 'formula', 'shortcut', 'vocabulary', 'fact', 'reminder', 'current_affairs']).optional(),
  examRelevance: z.array(z.string()).optional(),
  sourceUrl: z.string().nullable().optional(),
  sourceName: z.string().nullable().optional(),
  eventDate: z.string().nullable().optional(),
  isBookmarked: z.boolean().optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
