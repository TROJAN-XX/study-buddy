import type {
  Exam,
  Subject,
  Topic,
  StudySession,
  DailyGoal,
  Question,
  PracticeTest,
  PracticeAttempt,
  Mistake,
  RevisionItem,
  Note,
  Bookmark,
  Confidence,
  GoalPriority,
  GoalStatus,
  Difficulty,
  QuestionType,
  VerificationStatus,
  TestType,
  TestStatus,
  MarkedStatus,
  ErrorType,
  RevisionStatus,
  NoteType,
  BookmarkTargetType,
} from '@study-buddy/shared';

function safeJsonParse<T>(val: unknown, fallback: T): T {
  if (typeof val !== 'string') return (val as T) ?? fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

export function toExam(row: Record<string, unknown>): Exam {
  return {
    id: String(row.id),
    name: String(row.name),
    fullName: String(row.full_name),
    date: row.date ? String(row.date) : null,
    priority: Number(row.priority ?? 1),
    isActive: Boolean(row.is_active === 1 || row.is_active === true),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function toSubject(row: Record<string, unknown>): Subject {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category),
    icon: row.icon ? String(row.icon) : undefined,
  };
}

export function toTopic(row: Record<string, unknown>): Topic {
  return {
    id: String(row.id),
    subjectId: String(row.subject_id),
    name: String(row.name),
    parentTopicId: row.parent_topic_id ? String(row.parent_topic_id) : null,
  };
}

export function toStudySession(row: Record<string, unknown>): StudySession {
  return {
    id: String(row.id),
    date: String(row.date),
    examId: row.exam_id ? String(row.exam_id) : null,
    subject: String(row.subject),
    topic: String(row.topic),
    durationMinutes: Number(row.duration_minutes ?? 0),
    questionsAttempted: Number(row.questions_attempted ?? 0),
    correct: Number(row.correct ?? 0),
    incorrect: Number(row.incorrect ?? 0),
    skipped: Number(row.skipped ?? 0),
    confidence: (row.confidence as Confidence) || 'medium',
    reflection: row.reflection ? String(row.reflection) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function toDailyGoal(row: Record<string, unknown>): DailyGoal {
  return {
    id: String(row.id),
    date: String(row.date),
    subject: String(row.subject),
    topic: String(row.topic),
    targetDescription: String(row.target_description),
    targetQuantity: row.target_quantity !== null && row.target_quantity !== undefined ? Number(row.target_quantity) : null,
    targetDurationMinutes: row.target_duration_minutes !== null && row.target_duration_minutes !== undefined ? Number(row.target_duration_minutes) : null,
    priority: (row.priority as GoalPriority) || 'medium',
    status: (row.status as GoalStatus) || 'planned',
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function toQuestion(row: Record<string, unknown>): Question {
  return {
    id: String(row.id),
    exam: String(row.exam),
    year: row.year !== null && row.year !== undefined ? Number(row.year) : null,
    paper: row.paper ? String(row.paper) : null,
    shift: row.shift ? String(row.shift) : null,
    subject: String(row.subject),
    topic: String(row.topic),
    difficulty: (row.difficulty as Difficulty) || 'medium',
    questionType: (row.question_type as QuestionType) || 'single_choice',
    questionText: String(row.question_text),
    options: safeJsonParse(row.options_json, []),
    answer: safeJsonParse(row.answer_json, []),
    explanation: row.explanation ? String(row.explanation) : null,
    source: safeJsonParse(row.source_json, null),
    verificationStatus: (row.verification_status as VerificationStatus) || 'unverified',
    tags: safeJsonParse(row.tags_json, []),
    packId: row.pack_id ? String(row.pack_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function toPracticeTest(row: Record<string, unknown>): PracticeTest {
  return {
    id: String(row.id),
    title: String(row.title),
    exam: row.exam ? String(row.exam) : null,
    type: (row.type as TestType) || 'mixed',
    config: safeJsonParse(row.config_json, { questionCount: 0 }),
    timeLimitMinutes: row.time_limit_minutes !== null && row.time_limit_minutes !== undefined ? Number(row.time_limit_minutes) : null,
    status: (row.status as TestStatus) || 'in_progress',
    score: row.score !== null && row.score !== undefined ? Number(row.score) : null,
    total: row.total !== null && row.total !== undefined ? Number(row.total) : null,
    startedAt: String(row.started_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: String(row.created_at),
  };
}

export function toPracticeAttempt(row: Record<string, unknown>): PracticeAttempt {
  return {
    id: String(row.id),
    testId: String(row.test_id),
    questionId: String(row.question_id),
    selectedAnswer: safeJsonParse(row.selected_answer_json, []),
    isCorrect: Boolean(row.is_correct === 1 || row.is_correct === true),
    timeSeconds: row.time_seconds !== null && row.time_seconds !== undefined ? Number(row.time_seconds) : null,
    markedStatus: (row.marked_status as MarkedStatus) || 'none',
    createdAt: String(row.created_at),
  };
}

export function toMistake(row: Record<string, unknown>): Mistake {
  return {
    id: String(row.id),
    questionId: String(row.question_id),
    attemptId: String(row.attempt_id),
    errorType: (row.error_type as ErrorType) || 'other',
    notes: row.notes ? String(row.notes) : null,
    revisionStatus: (row.revision_status as RevisionStatus) || 'pending',
    nextReviewDate: row.next_review_date ? String(row.next_review_date) : null,
    reviewCount: Number(row.review_count ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function toRevisionItem(row: Record<string, unknown>): RevisionItem {
  return {
    id: String(row.id),
    sourceType: (row.source_type as 'mistake' | 'topic' | 'note') || 'mistake',
    sourceId: String(row.source_id),
    topic: row.topic ? String(row.topic) : null,
    subject: row.subject ? String(row.subject) : null,
    nextReview: String(row.next_review),
    intervalDays: Number(row.interval_days ?? 1),
    easeFactor: Number(row.ease_factor ?? 2.5),
    status: (row.status as RevisionStatus) || 'pending',
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function toNote(row: Record<string, unknown>): Note {
  return {
    id: String(row.id),
    title: String(row.title),
    content: String(row.content),
    subject: row.subject ? String(row.subject) : null,
    topic: row.topic ? String(row.topic) : null,
    tags: safeJsonParse(row.tags_json, []),
    type: (row.type as NoteType) || 'concept',
    examRelevance: safeJsonParse(row.exam_relevance_json, []),
    sourceUrl: row.source_url ? String(row.source_url) : null,
    sourceName: row.source_name ? String(row.source_name) : null,
    eventDate: row.event_date ? String(row.event_date) : null,
    isBookmarked: Boolean(row.is_bookmarked === 1 || row.is_bookmarked === true),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function toBookmark(row: Record<string, unknown>): Bookmark {
  return {
    id: String(row.id),
    targetType: (row.target_type as BookmarkTargetType) || 'question',
    targetId: String(row.target_id),
    createdAt: String(row.created_at),
  };
}
