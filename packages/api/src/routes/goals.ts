import { Hono } from 'hono';
import type { ApiResponse, DailyGoal } from '@study-buddy/shared';
import type { Env } from '../types';
import { toDailyGoal } from '../db/mappers';
import { createGoalSchema, updateGoalSchema } from '../validation/schemas';

const goalsRoute = new Hono<{ Bindings: Env }>();

// GET /api/goals
goalsRoute.get('/', async (c) => {
  try {
    const dateParam = c.req.query('date');
    const statusParam = c.req.query('status');

    let query = 'SELECT * FROM daily_goals';
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (dateParam) {
      conditions.push('date = ?');
      params.push(dateParam);
    }

    if (statusParam) {
      conditions.push('status = ?');
      params.push(statusParam);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY date DESC, 
      CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, 
      created_at ASC`;

    const stmt = c.env.DB.prepare(query);
    const result = params.length > 0
      ? await stmt.bind(...params).all<Record<string, unknown>>()
      : await stmt.all<Record<string, unknown>>();

    const goals = (result.results || []).map(toDailyGoal);

    return c.json<ApiResponse<DailyGoal[]>>({
      success: true,
      data: goals,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve daily goals';
    return c.json<ApiResponse<DailyGoal[]>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

// GET /api/goals/:id
goalsRoute.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const row = await c.env.DB.prepare('SELECT * FROM daily_goals WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    if (!row) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Daily goal not found',
        },
        404
      );
    }

    return c.json<ApiResponse<DailyGoal>>({
      success: true,
      data: toDailyGoal(row),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve daily goal';
    return c.json<ApiResponse<DailyGoal>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

// POST /api/goals
goalsRoute.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const parseResult = createGoalSchema.safeParse(body);

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
      `INSERT INTO daily_goals (
        id, date, subject, topic, target_description,
        target_quantity, target_duration_minutes, priority,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        input.date,
        input.subject,
        input.topic,
        input.targetDescription,
        input.targetQuantity ?? null,
        input.targetDurationMinutes ?? null,
        input.priority,
        input.status,
        now,
        now
      )
      .run();

    const created: DailyGoal = {
      id,
      date: input.date,
      subject: input.subject,
      topic: input.topic,
      targetDescription: input.targetDescription,
      targetQuantity: input.targetQuantity ?? null,
      targetDurationMinutes: input.targetDurationMinutes ?? null,
      priority: input.priority,
      status: input.status,
      createdAt: now,
      updatedAt: now,
    };

    return c.json<ApiResponse<DailyGoal>>(
      {
        success: true,
        data: created,
      },
      201
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create daily goal';
    return c.json<ApiResponse<DailyGoal>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

// POST /api/goals/carry-forward
goalsRoute.post('/carry-forward', async (c) => {
  try {
    let targetDate = new Date().toISOString().slice(0, 10);
    try {
      const body = await c.req.json().catch(() => ({}));
      if (body && typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
        targetDate = body.date;
      }
    } catch {
      // Body is optional; fallback to today
    }

    const now = new Date().toISOString();

    // Find overdue goals
    const overdueResult = await c.env.DB.prepare(
      `SELECT * FROM daily_goals 
       WHERE date < ? AND status IN ('planned', 'in_progress', 'overdue')`
    )
      .bind(targetDate)
      .all<Record<string, unknown>>();

    const overdueRows = overdueResult.results || [];
    const movedCount = overdueRows.length;

    if (movedCount > 0) {
      await c.env.DB.prepare(
        `UPDATE daily_goals 
         SET date = ?, status = 'planned', updated_at = ? 
         WHERE date < ? AND status IN ('planned', 'in_progress', 'overdue')`
      )
        .bind(targetDate, now, targetDate)
        .run();
    }

    // Return the updated list of goals for targetDate
    const updatedGoalsResult = await c.env.DB.prepare(
      `SELECT * FROM daily_goals 
       WHERE date = ? 
       ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, created_at ASC`
    )
      .bind(targetDate)
      .all<Record<string, unknown>>();

    const goals = (updatedGoalsResult.results || []).map(toDailyGoal);

    return c.json<ApiResponse<{ movedCount: number; date: string; goals: DailyGoal[] }>>({
      success: true,
      data: {
        movedCount,
        date: targetDate,
        goals,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to carry forward daily goals';
    return c.json<ApiResponse<never>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

// PUT /api/goals/:id
goalsRoute.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await c.env.DB.prepare('SELECT * FROM daily_goals WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    if (!existing) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Daily goal not found',
        },
        404
      );
    }

    const currentGoal = toDailyGoal(existing);
    const body = await c.req.json();
    const parseResult = updateGoalSchema.safeParse(body);

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

    const updatedGoal: DailyGoal = {
      ...currentGoal,
      date: input.date ?? currentGoal.date,
      subject: input.subject ?? currentGoal.subject,
      topic: input.topic ?? currentGoal.topic,
      targetDescription: input.targetDescription ?? currentGoal.targetDescription,
      targetQuantity: input.targetQuantity !== undefined ? input.targetQuantity : currentGoal.targetQuantity,
      targetDurationMinutes: input.targetDurationMinutes !== undefined ? input.targetDurationMinutes : currentGoal.targetDurationMinutes,
      priority: input.priority ?? currentGoal.priority,
      status: input.status ?? currentGoal.status,
      updatedAt: now,
    };

    await c.env.DB.prepare(
      `UPDATE daily_goals SET
        date = ?, subject = ?, topic = ?, target_description = ?,
        target_quantity = ?, target_duration_minutes = ?, priority = ?,
        status = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(
        updatedGoal.date,
        updatedGoal.subject,
        updatedGoal.topic,
        updatedGoal.targetDescription,
        updatedGoal.targetQuantity,
        updatedGoal.targetDurationMinutes,
        updatedGoal.priority,
        updatedGoal.status,
        updatedGoal.updatedAt,
        id
      )
      .run();

    return c.json<ApiResponse<DailyGoal>>({
      success: true,
      data: updatedGoal,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update daily goal';
    return c.json<ApiResponse<DailyGoal>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

// DELETE /api/goals/:id
goalsRoute.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await c.env.DB.prepare('SELECT id FROM daily_goals WHERE id = ?')
      .bind(id)
      .first<{ id: string }>();

    if (!existing) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Daily goal not found',
        },
        404
      );
    }

    await c.env.DB.prepare('DELETE FROM daily_goals WHERE id = ?').bind(id).run();

    return c.json<ApiResponse<{ id: string }>>({
      success: true,
      data: { id },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete daily goal';
    return c.json<ApiResponse<{ id: string }>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

export default goalsRoute;
