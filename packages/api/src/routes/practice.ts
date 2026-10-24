import { Hono } from 'hono';
import type { ApiResponse, PracticeTest, PracticeAttempt } from '@study-buddy/shared';
import type { Env } from '../types';
import { toPracticeTest, toPracticeAttempt } from '../db/mappers';

const practice = new Hono<{ Bindings: Env }>();

// GET /api/practice/tests - List past tests
practice.get('/tests', async (c) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));
    const rows = await c.env.DB.prepare(`
      SELECT * FROM practice_tests 
      ORDER BY started_at DESC 
      LIMIT ?
    `).bind(limit).all<Record<string, unknown>>();

    const tests = (rows.results || []).map(toPracticeTest);
    return c.json<ApiResponse<PracticeTest[]>>({ success: true, data: tests });
  } catch (err) {
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to fetch tests' }, 500);
  }
});

// GET /api/practice/tests/:id - Get test with attempts
practice.get('/tests/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const testRow = await c.env.DB.prepare('SELECT * FROM practice_tests WHERE id = ?').bind(id).first<Record<string, unknown>>();

    if (!testRow) {
      return c.json<ApiResponse<never>>({ success: false, error: 'Test not found' }, 404);
    }

    const test = toPracticeTest(testRow);

    const attemptRows = await c.env.DB.prepare(`
      SELECT * FROM practice_attempts 
      WHERE test_id = ? 
      ORDER BY created_at ASC
    `).bind(id).all<Record<string, unknown>>();

    const attempts = (attemptRows.results || []).map(toPracticeAttempt);

    return c.json<ApiResponse<{ test: PracticeTest; attempts: PracticeAttempt[] }>>({
      success: true,
      data: { test, attempts },
    });
  } catch (err) {
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to fetch test details' }, 500);
  }
});

// POST /api/practice/tests/submit - Submit completed test and record attempts + mistakes
practice.post('/tests/submit', async (c) => {
  try {
    const body = await c.req.json<{
      test: PracticeTest;
      attempts: PracticeAttempt[];
    }>();

    const { test, attempts } = body;
    if (!test || !test.id) {
      return c.json<ApiResponse<never>>({ success: false, error: 'Invalid test payload' }, 400);
    }

    const now = new Date().toISOString();
    const statements = [];

    // 1. Insert or update practice test record
    statements.push(
      c.env.DB.prepare(`
        INSERT OR REPLACE INTO practice_tests (
          id, title, exam, type, config_json, time_limit_minutes, status, score, total, started_at, completed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        test.id,
        test.title,
        test.exam || null,
        test.type,
        JSON.stringify(test.config),
        test.timeLimitMinutes || null,
        test.status || 'completed',
        test.score ?? 0,
        test.total ?? attempts.length,
        test.startedAt || now,
        test.completedAt || now,
        test.createdAt || now
      )
    );

    // 2. Insert attempts and create mistake records for wrong or uncertain questions
    for (const att of attempts) {
      // Resolve the attempt id once: the mistake row references it as a FK.
      const attemptId = att.id || crypto.randomUUID();

      statements.push(
        c.env.DB.prepare(`
          INSERT OR REPLACE INTO practice_attempts (
            id, test_id, question_id, selected_answer_json, is_correct, time_seconds, marked_status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          attemptId,
          test.id,
          att.questionId,
          JSON.stringify(att.selectedAnswer),
          att.isCorrect ? 1 : 0,
          att.timeSeconds || null,
          att.markedStatus || 'none',
          att.createdAt || now
        )
      );

      // Auto-schedule mistake if wrong or marked uncertain
      if (!att.isCorrect || att.markedStatus === 'uncertain') {
        const mistakeId = crypto.randomUUID();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextReviewDate = tomorrow.toISOString().split('T')[0];

        statements.push(
          c.env.DB.prepare(`
            INSERT OR IGNORE INTO mistakes (
              id, question_id, attempt_id, error_type, notes, revision_status, next_review_date, review_count, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            mistakeId,
            att.questionId,
            attemptId,
            att.markedStatus === 'uncertain' && att.isCorrect ? 'guessed_answer' : 'concept_gap',
            null,
            'pending',
            nextReviewDate,
            0,
            now,
            now
          )
        );

        // Also add to revision_items table
        statements.push(
          c.env.DB.prepare(`
            INSERT OR IGNORE INTO revision_items (
              id, source_type, source_id, topic, subject, next_review, interval_days, ease_factor, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            'mistake',
            mistakeId,
            null,
            null,
            nextReviewDate,
            1,
            2.5,
            'pending',
            now,
            now
          )
        );
      }
    }

    // Execute batch
    const batchSize = 50;
    for (let i = 0; i < statements.length; i += batchSize) {
      await c.env.DB.batch(statements.slice(i, i + batchSize));
    }

    return c.json<ApiResponse<{ testId: string; attemptsRecorded: number }>>({
      success: true,
      data: { testId: test.id, attemptsRecorded: attempts.length },
    });
  } catch (err) {
    console.error('Error submitting test:', err);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to record test submission' }, 500);
  }
});

export default practice;
