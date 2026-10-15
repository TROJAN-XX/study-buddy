import { Hono } from 'hono';
import type { ApiResponse, Subject, Topic } from '@study-buddy/shared';
import type { Env } from '../types';
import { toSubject, toTopic } from '../db/mappers';

const taxonomyRoute = new Hono<{ Bindings: Env }>();

// GET /api/subjects
taxonomyRoute.get('/subjects', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM subjects ORDER BY category ASC, name ASC'
    ).all<Record<string, unknown>>();

    const subjects = (result.results || []).map(toSubject);

    return c.json<ApiResponse<Subject[]>>({
      success: true,
      data: subjects,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve subjects';
    return c.json<ApiResponse<Subject[]>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

// GET /api/topics
taxonomyRoute.get('/topics', async (c) => {
  try {
    const subjectId = c.req.query('subjectId') || c.req.query('subject_id');

    let query = 'SELECT * FROM topics';
    const params: unknown[] = [];

    if (subjectId) {
      query += ' WHERE subject_id = ? ORDER BY name ASC';
      params.push(subjectId);
    } else {
      query += ' ORDER BY subject_id ASC, name ASC';
    }

    const stmt = c.env.DB.prepare(query);
    const result = params.length > 0
      ? await stmt.bind(...params).all<Record<string, unknown>>()
      : await stmt.all<Record<string, unknown>>();

    const topics = (result.results || []).map(toTopic);

    return c.json<ApiResponse<Topic[]>>({
      success: true,
      data: topics,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve topics';
    return c.json<ApiResponse<Topic[]>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

export default taxonomyRoute;
