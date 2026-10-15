import { Hono } from 'hono';
import type { ApiResponse, Mistake, Question } from '@study-buddy/shared';
import type { Env } from '../types';
import { toMistake, toQuestion } from '../db/mappers';
import { updateMistakeSchema } from '../validation/schemas';

const mistakes = new Hono<{ Bindings: Env }>();

export interface MistakeDetail extends Mistake {
  question?: Question | null;
}

// GET /api/mistakes - List mistakes with optional filters
mistakes.get('/', async (c) => {
  try {
    const errorType = c.req.query('errorType');
    const revisionStatus = c.req.query('revisionStatus');
    const subject = c.req.query('subject');
    const topic = c.req.query('topic');
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10)));

    let query = `
      SELECT m.*, 
             q.id as q_id, q.exam as q_exam, q.year as q_year, q.paper as q_paper, q.shift as q_shift,
             q.subject as q_subject, q.topic as q_topic, q.difficulty as q_difficulty,
             q.question_type as q_question_type, q.question_text as q_question_text,
             q.options_json as q_options_json, q.answer_json as q_answer_json,
             q.explanation as q_explanation, q.source_json as q_source_json,
             q.verification_status as q_verification_status, q.tags_json as q_tags_json,
             q.pack_id as q_pack_id, q.created_at as q_created_at, q.updated_at as q_updated_at
      FROM mistakes m
      LEFT JOIN questions q ON m.question_id = q.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (errorType) {
      query += ' AND m.error_type = ?';
      params.push(errorType);
    }
    if (revisionStatus) {
      query += ' AND m.revision_status = ?';
      params.push(revisionStatus);
    }
    if (subject) {
      query += ' AND q.subject = ?';
      params.push(subject);
    }
    if (topic) {
      query += ' AND q.topic = ?';
      params.push(topic);
    }

    query += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit);

    const rows = await c.env.DB.prepare(query).bind(...params).all<Record<string, unknown>>();

    const data: MistakeDetail[] = (rows.results || []).map((row) => {
      const mistake = toMistake(row);
      let question: Question | null = null;

      if (row.q_id) {
        question = toQuestion({
          id: row.q_id,
          exam: row.q_exam,
          year: row.q_year,
          paper: row.q_paper,
          shift: row.q_shift,
          subject: row.q_subject,
          topic: row.q_topic,
          difficulty: row.q_difficulty,
          question_type: row.q_question_type,
          question_text: row.q_question_text,
          options_json: row.q_options_json,
          answer_json: row.q_answer_json,
          explanation: row.q_explanation,
          source_json: row.q_source_json,
          verification_status: row.q_verification_status,
          tags_json: row.q_tags_json,
          pack_id: row.q_pack_id,
          created_at: row.q_created_at,
          updated_at: row.q_updated_at,
        });
      }

      return {
        ...mistake,
        question,
      };
    });

    return c.json<ApiResponse<MistakeDetail[]>>({ success: true, data });
  } catch (err) {
    console.error('Error fetching mistakes:', err);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to fetch mistakes' }, 500);
  }
});

// GET /api/mistakes/:id - Get single mistake
mistakes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const row = await c.env.DB.prepare('SELECT * FROM mistakes WHERE id = ?').bind(id).first<Record<string, unknown>>();

    if (!row) {
      return c.json<ApiResponse<never>>({ success: false, error: 'Mistake not found' }, 404);
    }

    const mistake = toMistake(row);
    const qRow = await c.env.DB.prepare('SELECT * FROM questions WHERE id = ?').bind(mistake.questionId).first<Record<string, unknown>>();
    const question = qRow ? toQuestion(qRow) : null;

    return c.json<ApiResponse<MistakeDetail>>({
      success: true,
      data: { ...mistake, question },
    });
  } catch (err) {
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to fetch mistake' }, 500);
  }
});

// PUT /api/mistakes/:id - Update mistake classification & reflection
mistakes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = updateMistakeSchema.safeParse(body);

    if (!parsed.success) {
      return c.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Validation failed',
          errors: parsed.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
        400
      );
    }

    const existing = await c.env.DB.prepare('SELECT * FROM mistakes WHERE id = ?').bind(id).first<Record<string, unknown>>();
    if (!existing) {
      return c.json<ApiResponse<never>>({ success: false, error: 'Mistake not found' }, 404);
    }

    const current = toMistake(existing);
    const updated: Mistake = {
      ...current,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };

    await c.env.DB.prepare(`
      UPDATE mistakes SET
        error_type = ?,
        notes = ?,
        revision_status = ?,
        next_review_date = ?,
        review_count = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      updated.errorType,
      updated.notes ?? null,
      updated.revisionStatus,
      updated.nextReviewDate ?? null,
      updated.reviewCount,
      updated.updatedAt,
      id
    ).run();

    return c.json<ApiResponse<Mistake>>({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating mistake:', err);
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to update mistake' }, 500);
  }
});

// DELETE /api/mistakes/:id - Delete mistake
mistakes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM mistakes WHERE id = ?').bind(id),
      c.env.DB.prepare('DELETE FROM revision_items WHERE source_type = "mistake" AND source_id = ?').bind(id),
    ]);

    return c.json<ApiResponse<{ deleted: boolean }>>({ success: true, data: { deleted: true } });
  } catch (err) {
    return c.json<ApiResponse<never>>({ success: false, error: 'Failed to delete mistake' }, 500);
  }
});

export default mistakes;
