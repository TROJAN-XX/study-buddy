import { Hono } from 'hono';
import type { ApiResponse, Bookmark } from '@study-buddy/shared';
import type { Env } from '../types';
import { toBookmark } from '../db/mappers';
import { createBookmarkSchema } from '../validation/schemas';

const bookmarks = new Hono<{ Bindings: Env }>();

// GET /api/bookmarks - List all bookmarks
bookmarks.get('/', async (c) => {
  try {
    const targetType = c.req.query('targetType');

    let query = 'SELECT * FROM bookmarks';
    const params: unknown[] = [];

    if (targetType) {
      query += ' WHERE target_type = ?';
      params.push(targetType);
    }

    query += ' ORDER BY created_at DESC';

    const rows = await c.env.DB.prepare(query).bind(...params).all<Record<string, unknown>>();
    const items = (rows.results || []).map(toBookmark);

    return c.json<ApiResponse<Bookmark[]>>({ success: true, data: items });
  } catch (err) {
    console.error('Error fetching bookmarks:', err);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to fetch bookmarks' }, 500);
  }
});

// POST /api/bookmarks - Create a bookmark (idempotent per target)
bookmarks.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = createBookmarkSchema.safeParse(body);

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

    const data = parsed.data;
    const id = data.id || crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Preserve the client id when it is the first write for this target;
    // otherwise keep the existing row (UNIQUE target_type + target_id).
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO bookmarks (id, target_type, target_id, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(id, data.targetType, data.targetId, createdAt).run();

    const row = await c.env.DB.prepare(
      'SELECT * FROM bookmarks WHERE target_type = ? AND target_id = ?'
    ).bind(data.targetType, data.targetId).first<Record<string, unknown>>();

    if (!row) {
      return c.json<ApiResponse<never>>({ success: false, error: 'Failed to create bookmark' }, 500);
    }

    return c.json<ApiResponse<Bookmark>>({ success: true, data: toBookmark(row) }, 201);
  } catch (err) {
    console.error('Error creating bookmark:', err);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to create bookmark' }, 500);
  }
});

// DELETE /api/bookmarks/target/:targetType/:targetId - Remove by target
// (robust when the client-generated id differs from the stored row).
bookmarks.delete('/target/:targetType/:targetId', async (c) => {
  try {
    const targetType = c.req.param('targetType');
    const targetId = c.req.param('targetId');

    await c.env.DB.prepare(
      'DELETE FROM bookmarks WHERE target_type = ? AND target_id = ?'
    ).bind(targetType, targetId).run();

    return c.json<ApiResponse<{ deleted: boolean }>>({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error('Error deleting bookmark by target:', err);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to delete bookmark' }, 500);
  }
});

// DELETE /api/bookmarks/:id - Remove a bookmark by id
bookmarks.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM bookmarks WHERE id = ?').bind(id).run();
    return c.json<ApiResponse<{ deleted: boolean }>>({ success: true, data: { deleted: true } });
  } catch (err) {
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to delete bookmark' }, 500);
  }
});

export default bookmarks;
