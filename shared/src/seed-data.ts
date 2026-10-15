import type { Exam, Subject, Topic } from './types';

// ─── Seed Exams ────────────────────────────────────────────────

export const EXAMS: Exam[] = [
  {
    id: 'ssc-cgl',
    name: 'SSC CGL',
    fullName: 'Staff Selection Commission - Combined Graduate Level',
    date: null,
    priority: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tnpsc-group4',
    name: 'TNPSC Group 4',
    fullName: 'Tamil Nadu Public Service Commission - Group IV',
    date: null,
    priority: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tnpsc-group2',
    name: 'TNPSC Group 2/2A',
    fullName: 'Tamil Nadu Public Service Commission - Group II & IIA',
    date: null,
    priority: 3,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ibps-po',
    name: 'IBPS PO',
    fullName: 'Institute of Banking Personnel Selection - Probationary Officer',
    date: null,
    priority: 4,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ibps-clerk',
    name: 'IBPS Clerk',
    fullName: 'Institute of Banking Personnel Selection - Clerk',
    date: null,
    priority: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ibps-so',
    name: 'IBPS SO',
    fullName: 'Institute of Banking Personnel Selection - Specialist Officer',
    date: null,
    priority: 6,
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sbi-po',
    name: 'SBI PO',
    fullName: 'State Bank of India - Probationary Officer',
    date: null,
    priority: 7,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sbi-clerk',
    name: 'SBI Clerk',
    fullName: 'State Bank of India - Junior Associate (Clerk)',
    date: null,
    priority: 8,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── Seed Subjects ─────────────────────────────────────────────

export const SUBJECTS: Subject[] = [
  { id: 'reasoning', name: 'Reasoning', category: 'core', icon: '🧠' },
  { id: 'quantitative', name: 'Quantitative Aptitude', category: 'core', icon: '📐' },
  { id: 'general-knowledge', name: 'General Knowledge', category: 'core', icon: '🌍' },
  { id: 'current-affairs', name: 'Current Affairs', category: 'core', icon: '📰' },
  { id: 'english', name: 'English Language', category: 'core', icon: '📝' },
  { id: 'exam-specific', name: 'Exam-specific Topics', category: 'specialized', icon: '🎯' },
];

// ─── Seed Topics ───────────────────────────────────────────────

export const TOPICS: Topic[] = [
  // Reasoning
  { id: 'verbal-reasoning', subjectId: 'reasoning', name: 'Verbal Reasoning' },
  { id: 'non-verbal-reasoning', subjectId: 'reasoning', name: 'Non-verbal Reasoning' },
  { id: 'logical-reasoning', subjectId: 'reasoning', name: 'Logical Reasoning' },
  { id: 'puzzles', subjectId: 'reasoning', name: 'Puzzles' },
  { id: 'seating-arrangement', subjectId: 'reasoning', name: 'Seating Arrangement' },
  { id: 'coding-decoding', subjectId: 'reasoning', name: 'Coding & Decoding' },
  { id: 'blood-relations', subjectId: 'reasoning', name: 'Blood Relations' },
  { id: 'direction-sense', subjectId: 'reasoning', name: 'Direction Sense' },
  { id: 'syllogisms', subjectId: 'reasoning', name: 'Syllogisms' },
  { id: 'inequalities', subjectId: 'reasoning', name: 'Inequalities' },

  // Quantitative Aptitude
  { id: 'arithmetic', subjectId: 'quantitative', name: 'Arithmetic' },
  { id: 'algebra', subjectId: 'quantitative', name: 'Algebra' },
  { id: 'geometry', subjectId: 'quantitative', name: 'Geometry' },
  { id: 'mensuration', subjectId: 'quantitative', name: 'Mensuration' },
  { id: 'data-interpretation', subjectId: 'quantitative', name: 'Data Interpretation' },
  { id: 'number-systems', subjectId: 'quantitative', name: 'Number Systems' },
  { id: 'percentages', subjectId: 'quantitative', name: 'Percentages' },
  { id: 'profit-loss', subjectId: 'quantitative', name: 'Profit & Loss' },
  { id: 'time-work', subjectId: 'quantitative', name: 'Time & Work' },
  { id: 'time-distance', subjectId: 'quantitative', name: 'Time & Distance' },
  { id: 'simple-compound-interest', subjectId: 'quantitative', name: 'Simple & Compound Interest' },
  { id: 'ratio-proportion', subjectId: 'quantitative', name: 'Ratio & Proportion' },
  { id: 'averages', subjectId: 'quantitative', name: 'Averages' },
  { id: 'trigonometry', subjectId: 'quantitative', name: 'Trigonometry' },

  // General Knowledge
  { id: 'history', subjectId: 'general-knowledge', name: 'History' },
  { id: 'geography', subjectId: 'general-knowledge', name: 'Geography' },
  { id: 'polity', subjectId: 'general-knowledge', name: 'Polity' },
  { id: 'economy', subjectId: 'general-knowledge', name: 'Economy' },
  { id: 'general-science', subjectId: 'general-knowledge', name: 'General Science' },
  { id: 'tamil-nadu-gk', subjectId: 'general-knowledge', name: 'Tamil Nadu GK' },
  { id: 'static-gk', subjectId: 'general-knowledge', name: 'Static GK' },

  // Current Affairs
  { id: 'ca-national', subjectId: 'current-affairs', name: 'National' },
  { id: 'ca-international', subjectId: 'current-affairs', name: 'International' },
  { id: 'ca-tamil-nadu', subjectId: 'current-affairs', name: 'Tamil Nadu' },
  { id: 'ca-economy', subjectId: 'current-affairs', name: 'Economy & Banking' },
  { id: 'ca-science-tech', subjectId: 'current-affairs', name: 'Science & Technology' },
  { id: 'ca-sports', subjectId: 'current-affairs', name: 'Sports' },
  { id: 'ca-awards', subjectId: 'current-affairs', name: 'Awards & Honours' },

  // English
  { id: 'grammar', subjectId: 'english', name: 'Grammar' },
  { id: 'vocabulary', subjectId: 'english', name: 'Vocabulary' },
  { id: 'reading-comprehension', subjectId: 'english', name: 'Reading Comprehension' },
  { id: 'sentence-correction', subjectId: 'english', name: 'Sentence Correction' },
  { id: 'cloze-test', subjectId: 'english', name: 'Cloze Test' },
  { id: 'para-jumbles', subjectId: 'english', name: 'Para Jumbles' },

  // Exam-specific
  { id: 'banking-awareness', subjectId: 'exam-specific', name: 'Banking Awareness' },
  { id: 'computer-knowledge', subjectId: 'exam-specific', name: 'Computer Knowledge' },
  { id: 'exam-general-studies', subjectId: 'exam-specific', name: 'General Studies' },
];
