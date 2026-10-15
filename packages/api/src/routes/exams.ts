import { Hono } from 'hono';
import type { ApiResponse, Exam } from '@study-buddy/shared';
import type { Env } from '../types';
import { toExam } from '../db/mappers';
import { updateExamSchema } from '../validation/schemas';

const examsRoute = new Hono<{ Bindings: Env }>();

// GET /api/exams
examsRoute.get('/', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM exams ORDER BY priority ASC, name ASC'
    ).all<Record<string, unknown>>();

    const exams = (result.results || []).map(toExam);

    return c.json<ApiResponse<Exam[]>>({
      success: true,
      data: exams,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve exams';
    return c.json<ApiResponse<Exam[]>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

// GET /api/exams/:id
examsRoute.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const row = await c.env.DB.prepare('SELECT * FROM exams WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    if (!row) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Exam not found',
        },
        404
      );
    }

    return c.json<ApiResponse<Exam>>({
      success: true,
      data: toExam(row),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve exam';
    return c.json<ApiResponse<Exam>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

// PUT /api/exams/:id
examsRoute.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await c.env.DB.prepare('SELECT * FROM exams WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    if (!existing) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Exam not found',
        },
        404
      );
    }

    const currentExam = toExam(existing);
    const body = await c.req.json();
    const parseResult = updateExamSchema.safeParse(body);

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

    const updatedExam: Exam = {
      ...currentExam,
      date: input.date !== undefined ? input.date : currentExam.date,
      priority: input.priority !== undefined ? input.priority : currentExam.priority,
      isActive: input.isActive !== undefined ? input.isActive : currentExam.isActive,
      updatedAt: now,
    };

    await c.env.DB.prepare(
      `UPDATE exams 
       SET date = ?, priority = ?, is_active = ?, updated_at = ? 
       WHERE id = ?`
    )
      .bind(
        updatedExam.date ?? null,
        updatedExam.priority,
        updatedExam.isActive ? 1 : 0,
        updatedExam.updatedAt,
        id
      )
      .run();

    return c.json<ApiResponse<Exam>>({
      success: true,
      data: updatedExam,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update exam';
    return c.json<ApiResponse<Exam>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

export default examsRoute;
