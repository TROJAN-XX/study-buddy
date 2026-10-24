import { describe, it, expect } from 'vitest';
import {
  createSessionSchema,
  createGoalSchema,
  createNoteSchema,
  createBookmarkSchema,
} from '../packages/api/src/validation/schemas';

describe('createSessionSchema', () => {
  const base = {
    date: '2026-10-24',
    subject: 'Quantitative Aptitude',
    topic: 'Percentages',
    durationMinutes: 45,
    confidence: 'medium' as const,
  };

  it('accepts a client-generated id so offline replays stay idempotent', () => {
    const parsed = createSessionSchema.parse({ ...base, id: 'client-id-123' });
    expect(parsed.id).toBe('client-id-123');
  });

  it('defaults question counters to zero', () => {
    const parsed = createSessionSchema.parse(base);
    expect(parsed.questionsAttempted).toBe(0);
    expect(parsed.correct).toBe(0);
    expect(parsed.incorrect).toBe(0);
    expect(parsed.skipped).toBe(0);
  });

  it('rejects malformed dates', () => {
    expect(createSessionSchema.safeParse({ ...base, date: '24/10/2026' }).success).toBe(false);
  });
});

describe('createGoalSchema', () => {
  it('requires a target description', () => {
    const result = createGoalSchema.safeParse({
      date: '2026-10-24',
      subject: 'Reasoning',
      topic: 'Puzzles',
    });
    expect(result.success).toBe(false);
  });

  it('applies default priority and status', () => {
    const parsed = createGoalSchema.parse({
      date: '2026-10-24',
      subject: 'Reasoning',
      topic: 'Puzzles',
      targetDescription: 'Solve 20 puzzles',
    });
    expect(parsed.priority).toBe('medium');
    expect(parsed.status).toBe('planned');
  });
});

describe('createNoteSchema', () => {
  it('defaults type and tags', () => {
    const parsed = createNoteSchema.parse({ title: 'Quadratic formula' });
    expect(parsed.type).toBe('concept');
    expect(parsed.tags).toEqual([]);
    expect(parsed.content).toBe('');
  });
});

describe('createBookmarkSchema', () => {
  it('accepts a known target type', () => {
    const parsed = createBookmarkSchema.parse({ targetType: 'question', targetId: 'q1' });
    expect(parsed.targetType).toBe('question');
  });

  it('rejects unknown target types', () => {
    const result = createBookmarkSchema.safeParse({ targetType: 'session', targetId: 's1' });
    expect(result.success).toBe(false);
  });
});
