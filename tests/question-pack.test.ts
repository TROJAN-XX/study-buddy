import { describe, it, expect } from 'vitest';
import { validateQuestionPack } from '../shared/src/schemas';

const validItem = {
  id: 'ssc-cgl-2024-quant-0001',
  exam: 'SSC CGL',
  year: 2024,
  subject: 'Quantitative Aptitude',
  topic: 'Percentages',
  difficulty: 'easy',
  questionText: 'What is 25% of 200?',
  options: [
    { id: 'A', text: '25' },
    { id: 'B', text: '50' },
    { id: 'C', text: '75' },
    { id: 'D', text: '100' },
  ],
  answer: ['B'],
  explanation: '25% of 200 = 50.',
};

describe('validateQuestionPack', () => {
  it('normalises a valid pack and defaults missing metadata', () => {
    const result = validateQuestionPack([validItem]);

    expect(result.valid).toBe(true);
    expect(result.totalRecords).toBe(1);
    expect(result.validRecords).toBe(1);
    expect(result.invalidRecords).toBe(0);
    expect(result.errors).toHaveLength(0);

    const question = result.questions[0];
    expect(question.questionText).toBe('What is 25% of 200?');
    expect(question.questionType).toBe('single_choice');
    expect(question.verificationStatus).toBe('unverified');
    expect(question.tags).toEqual([]);
    expect(question.createdAt).toBeTruthy();
  });

  it('accepts a wrapper object with a questions array', () => {
    const result = validateQuestionPack({ questions: [validItem] });
    expect(result.valid).toBe(true);
    expect(result.questions).toHaveLength(1);
  });

  it('reports duplicate ids at row level', () => {
    const result = validateQuestionPack([validItem, { ...validItem }]);

    expect(result.valid).toBe(false);
    expect(result.validRecords).toBe(1);
    expect(result.errors).toEqual([
      expect.objectContaining({ row: 2, id: validItem.id, field: 'id' }),
    ]);
  });

  it('rejects answer keys that are not present in the options', () => {
    const result = validateQuestionPack([{ ...validItem, answer: ['Z'] }]);

    expect(result.valid).toBe(false);
    expect(result.questions).toHaveLength(0);
    expect(result.errors[0]).toEqual(
      expect.objectContaining({ row: 1, field: 'answer' })
    );
  });

  it('rejects packs whose root is not an array or questions wrapper', () => {
    const result = validateQuestionPack({ foo: 'bar' });

    expect(result.valid).toBe(false);
    expect(result.totalRecords).toBe(0);
    expect(result.errors[0]).toEqual(
      expect.objectContaining({ row: 0, field: 'root' })
    );
  });

  it('reports empty question prompts', () => {
    const result = validateQuestionPack([{ ...validItem, questionText: '   ' }]);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toEqual(
      expect.objectContaining({ row: 1, field: 'question' })
    );
  });
});
