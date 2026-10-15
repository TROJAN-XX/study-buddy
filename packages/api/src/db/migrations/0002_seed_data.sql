-- Migration 0002: Seed Data

-- Exams
INSERT OR IGNORE INTO exams (id, name, full_name, date, priority, is_active, created_at, updated_at) VALUES
('ssc-cgl', 'SSC CGL', 'Staff Selection Commission - Combined Graduate Level', NULL, 1, 1, '2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z'),
('tnpsc-group4', 'TNPSC Group 4', 'Tamil Nadu Public Service Commission - Group IV', NULL, 2, 1, '2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z'),
('tnpsc-group2', 'TNPSC Group 2/2A', 'Tamil Nadu Public Service Commission - Group II & IIA', NULL, 3, 1, '2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z'),
('ibps-po', 'IBPS PO', 'Institute of Banking Personnel Selection - Probationary Officer', NULL, 4, 1, '2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z'),
('ibps-clerk', 'IBPS Clerk', 'Institute of Banking Personnel Selection - Clerk', NULL, 5, 1, '2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z'),
('ibps-so', 'IBPS SO', 'Institute of Banking Personnel Selection - Specialist Officer', NULL, 6, 0, '2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z'),
('sbi-po', 'SBI PO', 'State Bank of India - Probationary Officer', NULL, 7, 1, '2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z'),
('sbi-clerk', 'SBI Clerk', 'State Bank of India - Junior Associate (Clerk)', NULL, 8, 1, '2026-10-15T00:00:00.000Z', '2026-10-15T00:00:00.000Z');

-- Subjects
INSERT OR IGNORE INTO subjects (id, name, category, icon) VALUES
('reasoning', 'Reasoning', 'core', '🧠'),
('quantitative', 'Quantitative Aptitude', 'core', '📐'),
('general-knowledge', 'General Knowledge', 'core', '🌍'),
('current-affairs', 'Current Affairs', 'core', '📰'),
('english', 'English Language', 'core', '📝'),
('exam-specific', 'Exam-specific Topics', 'specialized', '🎯');

-- Topics
INSERT OR IGNORE INTO topics (id, subject_id, name, parent_topic_id) VALUES
-- Reasoning
('verbal-reasoning', 'reasoning', 'Verbal Reasoning', NULL),
('non-verbal-reasoning', 'reasoning', 'Non-verbal Reasoning', NULL),
('logical-reasoning', 'reasoning', 'Logical Reasoning', NULL),
('puzzles', 'reasoning', 'Puzzles', NULL),
('seating-arrangement', 'reasoning', 'Seating Arrangement', NULL),
('coding-decoding', 'reasoning', 'Coding & Decoding', NULL),
('blood-relations', 'reasoning', 'Blood Relations', NULL),
('direction-sense', 'reasoning', 'Direction Sense', NULL),
('syllogisms', 'reasoning', 'Syllogisms', NULL),
('inequalities', 'reasoning', 'Inequalities', NULL),

-- Quantitative Aptitude
('arithmetic', 'quantitative', 'Arithmetic', NULL),
('algebra', 'quantitative', 'Algebra', NULL),
('geometry', 'quantitative', 'Geometry', NULL),
('mensuration', 'quantitative', 'Mensuration', NULL),
('data-interpretation', 'quantitative', 'Data Interpretation', NULL),
('number-systems', 'quantitative', 'Number Systems', NULL),
('percentages', 'quantitative', 'Percentages', NULL),
('profit-loss', 'quantitative', 'Profit & Loss', NULL),
('time-work', 'quantitative', 'Time & Work', NULL),
('time-distance', 'quantitative', 'Time & Distance', NULL),
('simple-compound-interest', 'quantitative', 'Simple & Compound Interest', NULL),
('ratio-proportion', 'quantitative', 'Ratio & Proportion', NULL),
('averages', 'quantitative', 'Averages', NULL),
('trigonometry', 'quantitative', 'Trigonometry', NULL),

-- General Knowledge
('history', 'general-knowledge', 'History', NULL),
('geography', 'general-knowledge', 'Geography', NULL),
('polity', 'general-knowledge', 'Polity', NULL),
('economy', 'general-knowledge', 'Economy', NULL),
('general-science', 'general-knowledge', 'General Science', NULL),
('tamil-nadu-gk', 'general-knowledge', 'Tamil Nadu GK', NULL),
('static-gk', 'general-knowledge', 'Static GK', NULL),

-- Current Affairs
('ca-national', 'current-affairs', 'National', NULL),
('ca-international', 'current-affairs', 'International', NULL),
('ca-tamil-nadu', 'current-affairs', 'Tamil Nadu', NULL),
('ca-economy', 'current-affairs', 'Economy & Banking', NULL),
('ca-science-tech', 'current-affairs', 'Science & Technology', NULL),
('ca-sports', 'current-affairs', 'Sports', NULL),
('ca-awards', 'current-affairs', 'Awards & Honours', NULL),

-- English
('grammar', 'english', 'Grammar', NULL),
('vocabulary', 'english', 'Vocabulary', NULL),
('reading-comprehension', 'english', 'Reading Comprehension', NULL),
('sentence-correction', 'english', 'Sentence Correction', NULL),
('cloze-test', 'english', 'Cloze Test', NULL),
('para-jumbles', 'english', 'Para Jumbles', NULL),

-- Exam-specific
('banking-awareness', 'exam-specific', 'Banking Awareness', NULL),
('computer-knowledge', 'exam-specific', 'Computer Knowledge', NULL),
('exam-general-studies', 'exam-specific', 'General Studies', NULL);
