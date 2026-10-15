import { Hono } from 'hono';
import type { D1PreparedStatement } from '@cloudflare/workers-types';
import type { ApiResponse, BackupData } from '@study-buddy/shared';
import type { Env } from '../types';
import {
  toExam,
  toStudySession,
  toDailyGoal,
  toQuestion,
  toPracticeTest,
  toPracticeAttempt,
  toMistake,
  toRevisionItem,
  toNote,
  toBookmark,
} from '../db/mappers';
import { backupDataSchema } from '../validation/schemas';

const backupRoute = new Hono<{ Bindings: Env }>();

// GET /api/backup/export
backupRoute.get('/export', async (c) => {
  try {
    const [
      examsRes,
      sessionsRes,
      goalsRes,
      questionsRes,
      testsRes,
      attemptsRes,
      mistakesRes,
      revisionItemsRes,
      notesRes,
      bookmarksRes,
    ] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM exams').all<Record<string, unknown>>(),
      c.env.DB.prepare('SELECT * FROM study_sessions').all<Record<string, unknown>>(),
      c.env.DB.prepare('SELECT * FROM daily_goals').all<Record<string, unknown>>(),
      c.env.DB.prepare('SELECT * FROM questions').all<Record<string, unknown>>(),
      c.env.DB.prepare('SELECT * FROM practice_tests').all<Record<string, unknown>>(),
      c.env.DB.prepare('SELECT * FROM practice_attempts').all<Record<string, unknown>>(),
      c.env.DB.prepare('SELECT * FROM mistakes').all<Record<string, unknown>>(),
      c.env.DB.prepare('SELECT * FROM revision_items').all<Record<string, unknown>>(),
      c.env.DB.prepare('SELECT * FROM notes').all<Record<string, unknown>>(),
      c.env.DB.prepare('SELECT * FROM bookmarks').all<Record<string, unknown>>(),
    ]);

    const backupData: BackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exams: (examsRes.results || []).map(toExam),
      sessions: (sessionsRes.results || []).map(toStudySession),
      goals: (goalsRes.results || []).map(toDailyGoal),
      questions: (questionsRes.results || []).map(toQuestion),
      tests: (testsRes.results || []).map(toPracticeTest),
      attempts: (attemptsRes.results || []).map(toPracticeAttempt),
      mistakes: (mistakesRes.results || []).map(toMistake),
      revisionItems: (revisionItemsRes.results || []).map(toRevisionItem),
      notes: (notesRes.results || []).map(toNote),
      bookmarks: (bookmarksRes.results || []).map(toBookmark),
    };

    return c.json<ApiResponse<BackupData>>({
      success: true,
      data: backupData,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to export backup data';
    return c.json<ApiResponse<BackupData>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

// POST /api/backup/import
backupRoute.post('/import', async (c) => {
  try {
    const body = await c.req.json();
    const parseResult = backupDataSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Validation failed for backup data',
          errors: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        400
      );
    }

    const data = parseResult.data;
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];

    // 1. Exams
    for (const exam of data.exams) {
      statements.push(
        c.env.DB.prepare(
          `INSERT OR REPLACE INTO exams (id, name, full_name, date, priority, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          exam.id,
          exam.name,
          exam.fullName,
          exam.date ?? null,
          exam.priority,
          exam.isActive ? 1 : 0,
          exam.createdAt || now,
          exam.updatedAt || now
        )
      );
    }

    // 2. Study Sessions
    for (const session of data.sessions) {
      statements.push(
        c.env.DB.prepare(
          `INSERT OR REPLACE INTO study_sessions (
            id, date, exam_id, subject, topic, duration_minutes,
            questions_attempted, correct, incorrect, skipped,
            confidence, reflection, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          session.id,
          session.date,
          session.examId ?? null,
          session.subject,
          session.topic,
          session.durationMinutes,
          session.questionsAttempted,
          session.correct,
          session.incorrect,
          session.skipped,
          session.confidence,
          session.reflection ?? null,
          session.createdAt || now,
          session.updatedAt || now
        )
      );
    }

    // 3. Daily Goals
    for (const goal of data.goals) {
      statements.push(
        c.env.DB.prepare(
          `INSERT OR REPLACE INTO daily_goals (
            id, date, subject, topic, target_description,
            target_quantity, target_duration_minutes, priority,
            status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          goal.id,
          goal.date,
          goal.subject,
          goal.topic,
          goal.targetDescription,
          goal.targetQuantity ?? null,
          goal.targetDurationMinutes ?? null,
          goal.priority,
          goal.status,
          goal.createdAt || now,
          goal.updatedAt || now
        )
      );
    }

    // 4. Questions
    for (const question of data.questions) {
      statements.push(
        c.env.DB.prepare(
          `INSERT OR REPLACE INTO questions (
            id, exam, year, paper, shift, subject, topic, difficulty,
            question_type, question_text, options_json, answer_json,
            explanation, source_json, verification_status, tags_json,
            pack_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          question.id,
          question.exam,
          question.year ?? null,
          question.paper ?? null,
          question.shift ?? null,
          question.subject,
          question.topic,
          question.difficulty,
          question.questionType,
          question.questionText,
          JSON.stringify(question.options || []),
          JSON.stringify(question.answer || []),
          question.explanation ?? null,
          question.source ? JSON.stringify(question.source) : null,
          question.verificationStatus,
          JSON.stringify(question.tags || []),
          question.packId ?? null,
          question.createdAt || now,
          question.updatedAt || now
        )
      );
    }

    // 5. Practice Tests
    for (const test of data.tests) {
      statements.push(
        c.env.DB.prepare(
          `INSERT OR REPLACE INTO practice_tests (
            id, title, exam, type, config_json, time_limit_minutes,
            status, score, total, started_at, completed_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          test.id,
          test.title,
          test.exam ?? null,
          test.type,
          JSON.stringify(test.config || {}),
          test.timeLimitMinutes ?? null,
          test.status,
          test.score ?? null,
          test.total ?? null,
          test.startedAt,
          test.completedAt ?? null,
          test.createdAt || now
        )
      );
    }

    // 6. Practice Attempts
    for (const attempt of data.attempts) {
      statements.push(
        c.env.DB.prepare(
          `INSERT OR REPLACE INTO practice_attempts (
            id, test_id, question_id, selected_answer_json,
            is_correct, time_seconds, marked_status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          attempt.id,
          attempt.testId,
          attempt.questionId,
          JSON.stringify(attempt.selectedAnswer || []),
          attempt.isCorrect ? 1 : 0,
          attempt.timeSeconds ?? null,
          attempt.markedStatus,
          attempt.createdAt || now
        )
      );
    }

    // 7. Mistakes
    for (const mistake of data.mistakes) {
      statements.push(
        c.env.DB.prepare(
          `INSERT OR REPLACE INTO mistakes (
            id, question_id, attempt_id, error_type, notes,
            revision_status, next_review_date, review_count,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          mistake.id,
          mistake.questionId,
          mistake.attemptId,
          mistake.errorType,
          mistake.notes ?? null,
          mistake.revisionStatus,
          mistake.nextReviewDate ?? null,
          mistake.reviewCount,
          mistake.createdAt || now,
          mistake.updatedAt || now
        )
      );
    }

    // 8. Revision Items
    for (const rev of data.revisionItems) {
      statements.push(
        c.env.DB.prepare(
          `INSERT OR REPLACE INTO revision_items (
            id, source_type, source_id, topic, subject,
            next_review, interval_days, ease_factor, status,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          rev.id,
          rev.sourceType,
          rev.sourceId,
          rev.topic ?? null,
          rev.subject ?? null,
          rev.nextReview,
          rev.intervalDays,
          rev.easeFactor,
          rev.status,
          rev.createdAt || now,
          rev.updatedAt || now
        )
      );
    }

    // 9. Notes
    for (const note of data.notes) {
      statements.push(
        c.env.DB.prepare(
          `INSERT OR REPLACE INTO notes (
            id, title, content, subject, topic, tags_json,
            type, exam_relevance_json, source_url, source_name,
            event_date, is_bookmarked, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          note.id,
          note.title,
          note.content,
          note.subject ?? null,
          note.topic ?? null,
          JSON.stringify(note.tags || []),
          note.type,
          JSON.stringify(note.examRelevance || []),
          note.sourceUrl ?? null,
          note.sourceName ?? null,
          note.eventDate ?? null,
          note.isBookmarked ? 1 : 0,
          note.createdAt || now,
          note.updatedAt || now
        )
      );
    }

    // 10. Bookmarks
    for (const bm of data.bookmarks) {
      statements.push(
        c.env.DB.prepare(
          `INSERT OR REPLACE INTO bookmarks (id, target_type, target_id, created_at)
           VALUES (?, ?, ?, ?)`
        ).bind(bm.id, bm.targetType, bm.targetId, bm.createdAt || now)
      );
    }

    // Execute in chunks to respect D1 batch statement limitations
    const BATCH_CHUNK_SIZE = 50;
    for (let i = 0; i < statements.length; i += BATCH_CHUNK_SIZE) {
      const chunk = statements.slice(i, i + BATCH_CHUNK_SIZE);
      if (chunk.length > 0) {
        await c.env.DB.batch(chunk);
      }
    }

    const counts: Record<string, number> = {
      exams: data.exams.length,
      sessions: data.sessions.length,
      goals: data.goals.length,
      questions: data.questions.length,
      tests: data.tests.length,
      attempts: data.attempts.length,
      mistakes: data.mistakes.length,
      revisionItems: data.revisionItems.length,
      notes: data.notes.length,
      bookmarks: data.bookmarks.length,
    };

    return c.json<ApiResponse<{ message: string; counts: Record<string, number> }>>({
      success: true,
      data: {
        message: 'Backup data imported successfully',
        counts,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to import backup data';
    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

export default backupRoute;
