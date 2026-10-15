import { Hono } from 'hono';
import type { ApiResponse, RevisionItem } from '@study-buddy/shared';
import type { Env } from '../types';
import { toRevisionItem } from '../db/mappers';
import { reviewRevisionSchema, rescheduleRevisionSchema } from '../validation/schemas';

const revisions = new Hono<{ Bindings: Env }>();

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/revisions - List revision items
revisions.get('/', async (c) => {
  try {
    const status = c.req.query('status');
    const dueOnly = c.req.query('dueOnly') === 'true';
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10)));
    const today = getTodayString();

    let query = 'SELECT * FROM revision_items WHERE 1=1';
    const params: unknown[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (dueOnly) {
      query += ' AND next_review <= ? AND status != "mastered" AND status != "suspended"';
      params.push(today);
    }

    query += ' ORDER BY next_review ASC, created_at DESC LIMIT ?';
    params.push(limit);

    const rows = await c.env.DB.prepare(query).bind(...params).all<Record<string, unknown>>();
    const items = (rows.results || []).map(toRevisionItem);

    return c.json<ApiResponse<RevisionItem[]>>({ success: true, data: items });
  } catch (err) {
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to fetch revision items' }, 500);
  }
});

// POST /api/revisions/:id/review - Review an item with SM-2 grading
revisions.post('/:id/review', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = reviewRevisionSchema.safeParse(body);

    if (!parsed.success) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Validation failed',
          errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        },
        400
      );
    }

    const { grade } = parsed.data;
    const row = await c.env.DB.prepare('SELECT * FROM revision_items WHERE id = ?').bind(id).first<Record<string, unknown>>();

    if (!row) {
      return c.json<ApiResponse<never>>({ success: false, error: 'Revision item not found' }, 404);
    }

    const current = toRevisionItem(row);
    let interval = current.intervalDays;
    let ease = current.easeFactor;
    let status = current.status;

    if (grade === 'easy') {
      interval = Math.max(1, Math.round(interval * ease));
      ease = Math.min(3.0, ease + 0.15);
      status = interval >= 21 ? 'mastered' : 'reviewed';
    } else if (grade === 'difficult') {
      interval = Math.max(1, Math.round(interval * 1.2));
      ease = Math.max(1.3, ease - 0.15);
      status = 'reviewed';
    } else {
      // forgot
      interval = 1;
      ease = Math.max(1.3, ease - 0.2);
      status = 'pending';
    }

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);
    const nextReview = nextDate.toISOString().split('T')[0];
    const now = new Date().toISOString();

    const statements = [
      c.env.DB.prepare(`
        UPDATE revision_items SET
          interval_days = ?,
          ease_factor = ?,
          status = ?,
          next_review = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(interval, ease, status, nextReview, now, id),
    ];

    // If linked to a mistake, update the mistake record
    if (current.sourceType === 'mistake') {
      statements.push(
        c.env.DB.prepare(`
          UPDATE mistakes SET
            revision_status = ?,
            next_review_date = ?,
            review_count = review_count + 1,
            updated_at = ?
          WHERE id = ?
        `).bind(status, nextReview, now, current.sourceId)
      );
    }

    await c.env.DB.batch(statements);

    const updated: RevisionItem = {
      ...current,
      intervalDays: interval,
      easeFactor: ease,
      status,
      nextReview,
      updatedAt: now,
    };

    return c.json<ApiResponse<RevisionItem>>({ success: true, data: updated });
  } catch (err) {
    console.error('Error reviewing revision item:', err);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to record review' }, 500);
  }
});

// POST /api/revisions/reschedule - Reschedule overdue items
revisions.post('/reschedule', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = rescheduleRevisionSchema.safeParse(body);

    if (!parsed.success) {
      return c.json<ApiResponse<never>>({ success: false, error: 'Invalid reschedule payload' }, 400);
    }

    const { mode } = parsed.data;
    const today = getTodayString();

    const rows = await c.env.DB.prepare(`
      SELECT * FROM revision_items 
      WHERE next_review < ? AND status = 'pending'
      ORDER BY created_at ASC
    `).bind(today).all<Record<string, unknown>>();

    const overdue = (rows.results || []).map(toRevisionItem);
    if (overdue.length === 0) {
      return c.json<ApiResponse<{ rescheduledCount: number }>>({
        success: true,
        data: { rescheduledCount: 0 },
      });
    }

    const statements = [];
    const now = new Date().toISOString();

    for (let i = 0; i < overdue.length; i++) {
      const item = overdue[i];
      let newDateStr = today;

      if (mode === 'spread_3_days') {
        const offsetDays = (i % 3) + 1; // 1, 2, 3 days from today
        const target = new Date();
        target.setDate(target.getDate() + offsetDays);
        newDateStr = target.toISOString().split('T')[0];
      } else if (mode === 'defer_tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        newDateStr = tomorrow.toISOString().split('T')[0];
      }

      statements.push(
        c.env.DB.prepare(`
          UPDATE revision_items SET
            next_review = ?,
            updated_at = ?
          WHERE id = ?
        `).bind(newDateStr, now, item.id)
      );

      if (item.sourceType === 'mistake') {
        statements.push(
          c.env.DB.prepare(`
            UPDATE mistakes SET
              next_review_date = ?,
              updated_at = ?
            WHERE id = ?
          `).bind(newDateStr, now, item.sourceId)
        );
      }
    }

    const batchSize = 50;
    for (let i = 0; i < statements.length; i += batchSize) {
      await c.env.DB.batch(statements.slice(i, i + batchSize));
    }

    return c.json<ApiResponse<{ rescheduledCount: number }>>({
      success: true,
      data: { rescheduledCount: overdue.length },
    });
  } catch (err) {
    console.error('Error rescheduling revisions:', err);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to reschedule revisions' }, 500);
  }
});

export default revisions;
