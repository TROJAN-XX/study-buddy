import { Hono } from 'hono';
import type { ApiResponse, PaginatedResponse, StudySession } from '@study-buddy/shared';
import type { Env } from '../types';
import { toStudySession } from '../db/mappers';
import { createSessionSchema, updateSessionSchema } from '../validation/schemas';

const sessionsRoute = new Hono<{ Bindings: Env }>();

// GET /api/sessions
sessionsRoute.get('/', async (c) => {
  try {
    const dateParam = c.req.query('date');
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') || '20', 10)));
    const offset = (page - 1) * pageSize;

    let countQuery = 'SELECT COUNT(*) as count FROM study_sessions';
    let dataQuery = 'SELECT * FROM study_sessions';
    const params: unknown[] = [];

    if (dateParam) {
      countQuery += ' WHERE date = ?';
      dataQuery += ' WHERE date = ?';
      params.push(dateParam);
    }

    dataQuery += ' ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?';

    const countStmt = c.env.DB.prepare(countQuery);
    const countResult = params.length > 0
      ? await countStmt.bind(...params).first<{ count: number }>()
      : await countStmt.first<{ count: number }>();

    const total = Number(countResult?.count ?? 0);

    const dataStmt = c.env.DB.prepare(dataQuery);
    const dataParams = [...params, pageSize, offset];
    const dataResult = await dataStmt.bind(...dataParams).all<Record<string, unknown>>();

    const sessions = (dataResult.results || []).map(toStudySession);

    return c.json<PaginatedResponse<StudySession>>({
      success: true,
      data: sessions,
      total,
      page,
      pageSize,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve study sessions';
    return c.json<ApiResponse<StudySession[]>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

// GET /api/sessions/:id
sessionsRoute.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const row = await c.env.DB.prepare('SELECT * FROM study_sessions WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    if (!row) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Study session not found',
        },
        404
      );
    }

    return c.json<ApiResponse<StudySession>>({
      success: true,
      data: toStudySession(row),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve study session';
    return c.json<ApiResponse<StudySession>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

// POST /api/sessions
sessionsRoute.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const parseResult = createSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Validation failed',
          errors: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        400
      );
    }

    const input = parseResult.data;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO study_sessions (
        id, date, exam_id, subject, topic, duration_minutes,
        questions_attempted, correct, incorrect, skipped,
        confidence, reflection, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        input.date,
        input.examId || null,
        input.subject,
        input.topic,
        input.durationMinutes,
        input.questionsAttempted,
        input.correct,
        input.incorrect,
        input.skipped,
        input.confidence,
        input.reflection || null,
        now,
        now
      )
      .run();

    const created: StudySession = {
      id,
      date: input.date,
      examId: input.examId || null,
      subject: input.subject,
      topic: input.topic,
      durationMinutes: input.durationMinutes,
      questionsAttempted: input.questionsAttempted,
      correct: input.correct,
      incorrect: input.incorrect,
      skipped: input.skipped,
      confidence: input.confidence,
      reflection: input.reflection || null,
      createdAt: now,
      updatedAt: now,
    };

    return c.json<ApiResponse<StudySession>>(
      {
        success: true,
        data: created,
      },
      201
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create study session';
    return c.json<ApiResponse<StudySession>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

// PUT /api/sessions/:id
sessionsRoute.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await c.env.DB.prepare('SELECT * FROM study_sessions WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    if (!existing) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Study session not found',
        },
        404
      );
    }

    const currentSession = toStudySession(existing);
    const body = await c.req.json();
    const parseResult = updateSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Validation failed',
          errors: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        400
      );
    }

    const input = parseResult.data;
    const now = new Date().toISOString();

    const updatedSession: StudySession = {
      ...currentSession,
      date: input.date ?? currentSession.date,
      examId: input.examId !== undefined ? input.examId : currentSession.examId,
      subject: input.subject ?? currentSession.subject,
      topic: input.topic ?? currentSession.topic,
      durationMinutes: input.durationMinutes ?? currentSession.durationMinutes,
      questionsAttempted: input.questionsAttempted ?? currentSession.questionsAttempted,
      correct: input.correct ?? currentSession.correct,
      incorrect: input.incorrect ?? currentSession.incorrect,
      skipped: input.skipped ?? currentSession.skipped,
      confidence: input.confidence ?? currentSession.confidence,
      reflection: input.reflection !== undefined ? input.reflection : currentSession.reflection,
      updatedAt: now,
    };

    await c.env.DB.prepare(
      `UPDATE study_sessions SET
        date = ?, exam_id = ?, subject = ?, topic = ?, duration_minutes = ?,
        questions_attempted = ?, correct = ?, incorrect = ?, skipped = ?,
        confidence = ?, reflection = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(
        updatedSession.date,
        updatedSession.examId,
        updatedSession.subject,
        updatedSession.topic,
        updatedSession.durationMinutes,
        updatedSession.questionsAttempted,
        updatedSession.correct,
        updatedSession.incorrect,
        updatedSession.skipped,
        updatedSession.confidence,
        updatedSession.reflection,
        updatedSession.updatedAt,
        id
      )
      .run();

    return c.json<ApiResponse<StudySession>>({
      success: true,
      data: updatedSession,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update study session';
    return c.json<ApiResponse<StudySession>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

// DELETE /api/sessions/:id
sessionsRoute.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await c.env.DB.prepare('SELECT id FROM study_sessions WHERE id = ?')
      .bind(id)
      .first<{ id: string }>();

    if (!existing) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Study session not found',
        },
        404
      );
    }

    await c.env.DB.prepare('DELETE FROM study_sessions WHERE id = ?').bind(id).run();

    return c.json<ApiResponse<{ id: string }>>({
      success: true,
      data: { id },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete study session';
    return c.json<ApiResponse<{ id: string }>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

export default sessionsRoute;
