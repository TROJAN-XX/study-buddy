import { Hono } from 'hono';
import type { ApiResponse, Note } from '@study-buddy/shared';
import type { Env } from '../types';
import { toNote } from '../db/mappers';
import { createNoteSchema, updateNoteSchema } from '../validation/schemas';

const notes = new Hono<{ Bindings: Env }>();

// GET /api/notes - List notes with search & filtering
notes.get('/', async (c) => {
  try {
    const subject = c.req.query('subject');
    const topic = c.req.query('topic');
    const type = c.req.query('type');
    const q = c.req.query('q');
    const isBookmarked = c.req.query('isBookmarked');

    let query = 'SELECT * FROM notes WHERE 1=1';
    const params: unknown[] = [];

    if (subject) {
      query += ' AND subject = ?';
      params.push(subject);
    }
    if (topic) {
      query += ' AND topic = ?';
      params.push(topic);
    }
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (isBookmarked === 'true') {
      query += ' AND is_bookmarked = 1';
    }
    if (q) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    query += ' ORDER BY created_at DESC';

    const rows = await c.env.DB.prepare(query).bind(...params).all<Record<string, unknown>>();
    const items = (rows.results || []).map(toNote);

    return c.json<ApiResponse<Note[]>>({ success: true, data: items });
  } catch (err) {
    console.error('Error fetching notes:', err);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to fetch notes' }, 500);
  }
});

// GET /api/notes/:id - Get single note
notes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const row = await c.env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first<Record<string, unknown>>();

    if (!row) {
      return c.json<ApiResponse<never>>({ success: false, error: 'Note not found' }, 404);
    }

    return c.json<ApiResponse<Note>>({ success: true, data: toNote(row) });
  } catch (err) {
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to fetch note' }, 500);
  }
});

// POST /api/notes - Create note
notes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = createNoteSchema.safeParse(body);

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
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await c.env.DB.prepare(`
      INSERT INTO notes (
        id, title, content, subject, topic, tags_json, type, exam_relevance_json, source_url, source_name, event_date, is_bookmarked, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.title,
      data.content,
      data.subject || null,
      data.topic || null,
      JSON.stringify(data.tags || []),
      data.type,
      JSON.stringify(data.examRelevance || []),
      data.sourceUrl || null,
      data.sourceName || null,
      data.eventDate || null,
      data.isBookmarked ? 1 : 0,
      now,
      now
    ).run();

    const note: Note = {
      id,
      title: data.title,
      content: data.content,
      subject: data.subject || null,
      topic: data.topic || null,
      tags: data.tags || [],
      type: data.type,
      examRelevance: data.examRelevance || [],
      sourceUrl: data.sourceUrl || null,
      sourceName: data.sourceName || null,
      eventDate: data.eventDate || null,
      isBookmarked: Boolean(data.isBookmarked),
      createdAt: now,
      updatedAt: now,
    };

    return c.json<ApiResponse<Note>>({ success: true, data: note }, 201);
  } catch (err) {
    console.error('Error creating note:', err);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to create note' }, 500);
  }
});

// PUT /api/notes/:id - Update note
notes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = updateNoteSchema.safeParse(body);

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

    const existing = await c.env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first<Record<string, unknown>>();
    if (!existing) {
      return c.json<ApiResponse<never>>({ success: false, error: 'Note not found' }, 404);
    }

    const current = toNote(existing);
    const updated: Note = {
      ...current,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };

    await c.env.DB.prepare(`
      UPDATE notes SET
        title = ?,
        content = ?,
        subject = ?,
        topic = ?,
        tags_json = ?,
        type = ?,
        exam_relevance_json = ?,
        source_url = ?,
        source_name = ?,
        event_date = ?,
        is_bookmarked = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      updated.title,
      updated.content,
      updated.subject || null,
      updated.topic || null,
      JSON.stringify(updated.tags || []),
      updated.type,
      JSON.stringify(updated.examRelevance || []),
      updated.sourceUrl || null,
      updated.sourceName || null,
      updated.eventDate || null,
      updated.isBookmarked ? 1 : 0,
      updated.updatedAt,
      id
    ).run();

    return c.json<ApiResponse<Note>>({ success: true, data: updated });
  } catch (err) {
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to update note' }, 500);
  }
});

// DELETE /api/notes/:id - Delete note
notes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(id).run();
    return c.json<ApiResponse<{ deleted: boolean }>>({ success: true, data: { deleted: true } });
  } catch (err) {
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to delete note' }, 500);
  }
});

export default notes;
