import { z } from 'zod';
import type { Question, QuestionOption, Difficulty, QuestionType, VerificationStatus } from './types';

export const QuestionOptionSchema = z.object({
  id: z.string().min(1, 'Option ID is required (e.g. "A", "B", "1")'),
  text: z.string().min(1, 'Option text is required'),
});

export const QuestionSourceSchema = z.object({
  name: z.string().min(1, 'Source name is required'),
  reference: z.string().optional().nullable(),
});

export const RawQuestionItemSchema = z.object({
  id: z.string().min(1, 'Question ID is required'),
  exam: z.string().min(1, 'Exam name is required (e.g. "SSC CGL", "TNPSC Group 4")'),
  year: z.number().int().optional().nullable(),
  paper: z.string().optional().nullable(),
  shift: z.string().optional().nullable(),
  subject: z.string().min(1, 'Subject is required (e.g. "Quantitative Aptitude", "Reasoning")'),
  topic: z.string().min(1, 'Topic is required (e.g. "Percentages", "Puzzles")'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  // Allow camelCase or snake_case for question_type
  question_type: z.enum(['single_choice', 'multi_choice', 'true_false', 'fill_blank']).optional(),
  questionType: z.enum(['single_choice', 'multi_choice', 'true_false', 'fill_blank']).optional(),
  // Allow question, question_text, or questionText
  question: z.string().optional(),
  question_text: z.string().optional(),
  questionText: z.string().optional(),
  options: z.array(QuestionOptionSchema).min(2, 'At least 2 options are required for multiple-choice questions'),
  answer: z.array(z.string()).min(1, 'At least 1 correct answer must be specified'),
  explanation: z.string().optional().nullable(),
  source: QuestionSourceSchema.optional().nullable(),
  // Allow camelCase or snake_case for verification_status
  verification_status: z.enum(['verified', 'unverified', 'disputed']).default('unverified').optional(),
  verificationStatus: z.enum(['verified', 'unverified', 'disputed']).default('unverified').optional(),
  tags: z.array(z.string()).default([]),
  pack_id: z.string().optional().nullable(),
  packId: z.string().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export interface RowValidationError {
  row: number;
  id?: string;
  field: string;
  message: string;
}

export interface PackValidationResult {
  valid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  questions: Question[];
  errors: RowValidationError[];
}

/**
 * Validates an authored JSON question pack with detailed row-level error reporting
 * and automatic normalization to the internal Question domain entity.
 */
export function validateQuestionPack(data: unknown): PackValidationResult {
  const errors: RowValidationError[] = [];
  const validQuestions: Question[] = [];

  let items: unknown[] = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === 'object' && 'questions' in data && Array.isArray((data as any).questions)) {
    items = (data as any).questions;
  } else {
    return {
      valid: false,
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      questions: [],
      errors: [
        {
          row: 0,
          field: 'root',
          message: 'Question pack must be a JSON array of questions, or an object containing a "questions" array.',
        },
      ],
    };
  }

  const seenIds = new Set<string>();
  const now = new Date().toISOString();

  items.forEach((item, index) => {
    const rowNum = index + 1;
    const parseResult = RawQuestionItemSchema.safeParse(item);

    if (!parseResult.success) {
      parseResult.error.errors.forEach((err) => {
        errors.push({
          row: rowNum,
          id: (item as any)?.id,
          field: err.path.join('.') || 'record',
          message: err.message,
        });
      });
      return;
    }

    const raw = parseResult.data;

    // 1. Check duplicate ID within the same pack
    if (seenIds.has(raw.id)) {
      errors.push({
        row: rowNum,
        id: raw.id,
        field: 'id',
        message: `Duplicate question ID "${raw.id}" detected in row ${rowNum}.`,
      });
      return;
    }
    seenIds.add(raw.id);

    // 2. Resolve question text from possible keys
    const text = raw.questionText || raw.question || raw.question_text;
    if (!text || text.trim().length === 0) {
      errors.push({
        row: rowNum,
        id: raw.id,
        field: 'question',
        message: 'Question prompt text cannot be empty.',
      });
      return;
    }

    // 3. Verify answer keys match existing options
    const optionIds = new Set(raw.options.map((opt) => opt.id));
    const invalidAnswers = raw.answer.filter((ans) => !optionIds.has(ans));
    if (invalidAnswers.length > 0) {
      errors.push({
        row: rowNum,
        id: raw.id,
        field: 'answer',
        message: `Answer key(s) [${invalidAnswers.join(', ')}] not found among defined options [${Array.from(optionIds).join(', ')}].`,
      });
      return;
    }

    // 4. Resolve question type
    const qType: QuestionType = raw.questionType || raw.question_type || 'single_choice';

    // 5. Resolve verification status
    const vStatus: VerificationStatus = raw.verificationStatus || raw.verification_status || 'unverified';

    // 6. Assemble normalized Question domain model
    const normalizedQuestion: Question = {
      id: raw.id,
      exam: raw.exam,
      year: raw.year ?? null,
      paper: raw.paper ?? null,
      shift: raw.shift ?? null,
      subject: raw.subject,
      topic: raw.topic,
      difficulty: raw.difficulty as Difficulty,
      questionType: qType,
      questionText: text.trim(),
      options: raw.options,
      answer: raw.answer,
      explanation: raw.explanation ?? null,
      source: raw.source ? { name: raw.source.name, reference: raw.source.reference ?? null } : null,
      verificationStatus: vStatus,
      tags: raw.tags || [],
      packId: raw.packId || raw.pack_id || null,
      createdAt: raw.created_at || now,
      updatedAt: raw.updated_at || now,
    };

    validQuestions.push(normalizedQuestion);
  });

  return {
    valid: errors.length === 0,
    totalRecords: items.length,
    validRecords: validQuestions.length,
    invalidRecords: items.length - validQuestions.length,
    questions: validQuestions,
    errors,
  };
}
