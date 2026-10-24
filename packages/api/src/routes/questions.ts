import { Hono } from 'hono';
import type { ApiResponse, PaginatedResponse, Question, Bookmark } from '@study-buddy/shared';
import { validateQuestionPack } from '@study-buddy/shared';
import type { Env } from '../types';
import { toQuestion } from '../db/mappers';

const questions = new Hono<{ Bindings: Env }>();

// GET /api/questions - Filtered and paginated questions
questions.get('/', async (c) => {
  try {
    const exam = c.req.query('exam');
    const subject = c.req.query('subject');
    const topic = c.req.query('topic');
    const difficulty = c.req.query('difficulty');
    const q = c.req.query('q');
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') || '25', 10)));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (exam) {
      conditions.push('exam = ?');
      params.push(exam);
    }
    if (subject) {
      conditions.push('subject = ?');
      params.push(subject);
    }
    if (topic) {
      conditions.push('topic = ?');
      params.push(topic);
    }
    if (difficulty) {
      conditions.push('difficulty = ?');
      params.push(difficulty);
    }
    if (q) {
      conditions.push('(question_text LIKE ? OR tags_json LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countSql = `SELECT COUNT(*) as total FROM questions ${whereClause}`;
    const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ total: number }>();
    const total = countResult?.total ?? 0;

    // Fetch records
    const querySql = `
      SELECT * FROM questions 
      ${whereClause} 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const rows = await c.env.DB.prepare(querySql).bind(...params, pageSize, offset).all<Record<string, unknown>>();
    const items = (rows.results || []).map(toQuestion);

    return c.json<PaginatedResponse<Question>>({
      success: true,
      data: items,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error('Error fetching questions:', err);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to fetch questions' }, 500);
  }
});

// GET /api/questions/:id - Single question
questions.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const row = await c.env.DB.prepare('SELECT * FROM questions WHERE id = ?').bind(id).first<Record<string, unknown>>();

    if (!row) {
      return c.json<ApiResponse<never>>({ success: false, error: 'Question not found' }, 404);
    }

    return c.json<ApiResponse<Question>>({
      success: true,
      data: toQuestion(row),
    });
  } catch (err) {
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to fetch question' }, 500);
  }
});

// POST /api/questions/import - Import JSON Question Pack
questions.post('/import', async (c) => {
  try {
    const body = await c.req.json();
    const strategy = c.req.query('strategy') || 'skip'; // 'skip' or 'overwrite'

    const validation = validateQuestionPack(body);

    if (!validation.valid && validation.questions.length === 0) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: 'Validation failed for question pack',
        errors: validation.errors.map((e) => ({
          field: e.field,
          message: e.message,
          row: e.row,
        })),
      }, 400);
    }

    let inserted = 0;
    let skipped = 0;
    let updated = 0;

    const statements = [];
    const strategies: Array<'skip' | 'overwrite'> = [];

    for (const q of validation.questions) {
      if (strategy === 'overwrite') {
        statements.push(
          c.env.DB.prepare(`
            INSERT OR REPLACE INTO questions (
              id, exam, year, paper, shift, subject, topic, difficulty,
              question_type, question_text, options_json, answer_json,
              explanation, source_json, verification_status, tags_json,
              pack_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            q.id,
            q.exam,
            q.year,
            q.paper,
            q.shift,
            q.subject,
            q.topic,
            q.difficulty,
            q.questionType,
            q.questionText,
            JSON.stringify(q.options),
            JSON.stringify(q.answer),
            q.explanation,
            q.source ? JSON.stringify(q.source) : null,
            q.verificationStatus,
            JSON.stringify(q.tags),
            q.packId,
            q.createdAt,
            q.updatedAt
          )
        );
        strategies.push('overwrite');
      } else {
        // Skip existing
        statements.push(
          c.env.DB.prepare(`
            INSERT OR IGNORE INTO questions (
              id, exam, year, paper, shift, subject, topic, difficulty,
              question_type, question_text, options_json, answer_json,
              explanation, source_json, verification_status, tags_json,
              pack_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            q.id,
            q.exam,
            q.year,
            q.paper,
            q.shift,
            q.subject,
            q.topic,
            q.difficulty,
            q.questionType,
            q.questionText,
            JSON.stringify(q.options),
            JSON.stringify(q.answer),
            q.explanation,
            q.source ? JSON.stringify(q.source) : null,
            q.verificationStatus,
            JSON.stringify(q.tags),
            q.packId,
            q.createdAt,
            q.updatedAt
          )
        );
        strategies.push('skip');
      }
    }

    // Execute in batches to stay within the D1 statement limit, then derive
    // accurate counters from `meta.changes` (INSERT OR IGNORE reports 0 for
    // rows that already existed).
    const batchSize = 50;
    for (let i = 0; i < statements.length; i += batchSize) {
      const chunk = statements.slice(i, i + batchSize);
      const results = await c.env.DB.batch(chunk);

      results.forEach((result, index) => {
        const changed = result.meta?.changes ?? 0;
        const mode = strategies[i + index];

        if (mode === 'overwrite') {
          if (changed > 0) updated += 1;
          else skipped += 1;
        } else if (changed > 0) {
          inserted += 1;
        } else {
          skipped += 1;
        }
      });
    }

    return c.json<ApiResponse<{
      totalImported: number;
      skipped: number;
      updated: number;
      validationErrors: typeof validation.errors;
    }>>({
      success: true,
      data: {
        totalImported: inserted + updated,
        skipped,
        updated,
        validationErrors: validation.errors,
      },
    });
  } catch (err) {
    console.error('Question import error:', err);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to import question pack' }, 500);
  }
});

// DELETE /api/questions/:id
questions.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const res = await c.env.DB.prepare('DELETE FROM questions WHERE id = ?').bind(id).run();
    if (!res.meta.changes) {
      return c.json<ApiResponse<never>>({ success: false, error: 'Question not found' }, 404);
    }
    return c.json<ApiResponse<{ id: string }>>({ success: true, data: { id } });
  } catch (err) {
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to delete question' }, 500);
  }
});

export default questions;
