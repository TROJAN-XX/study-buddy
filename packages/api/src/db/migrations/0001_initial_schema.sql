-- Migration 0001: Initial Schema

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  date TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT
);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_topic_id TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  exam TEXT NOT NULL,
  year INTEGER,
  paper TEXT,
  shift TEXT,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options_json TEXT NOT NULL,
  answer_json TEXT NOT NULL,
  explanation TEXT,
  source_json TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  tags_json TEXT NOT NULL DEFAULT '[]',
  pack_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  exam_id TEXT,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  questions_attempted INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  incorrect INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  confidence TEXT NOT NULL,
  reflection TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_goals (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  target_description TEXT NOT NULL,
  target_quantity INTEGER,
  target_duration_minutes INTEGER,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS practice_tests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  exam TEXT,
  type TEXT NOT NULL,
  config_json TEXT NOT NULL,
  time_limit_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress',
  score INTEGER,
  total INTEGER,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS practice_attempts (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL REFERENCES practice_tests(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  selected_answer_json TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  time_seconds INTEGER,
  marked_status TEXT NOT NULL DEFAULT 'none',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mistakes (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  error_type TEXT NOT NULL,
  notes TEXT,
  revision_status TEXT NOT NULL DEFAULT 'pending',
  next_review_date TEXT,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS revision_items (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  topic TEXT,
  subject TEXT,
  next_review TEXT NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 1,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  subject TEXT,
  topic TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  type TEXT NOT NULL,
  exam_relevance_json TEXT NOT NULL DEFAULT '[]',
  source_url TEXT,
  source_name TEXT,
  event_date TEXT,
  is_bookmarked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_questions_exam_subject_topic ON questions(exam, subject, topic);
CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON study_sessions(date);
CREATE INDEX IF NOT EXISTS idx_daily_goals_date_status ON daily_goals(date, status);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_test_id ON practice_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_question_id ON mistakes(question_id);
CREATE INDEX IF NOT EXISTS idx_revision_items_next_review_status ON revision_items(next_review, status);
CREATE INDEX IF NOT EXISTS idx_notes_subject_topic_type ON notes(subject, topic, type);
CREATE INDEX IF NOT EXISTS idx_bookmarks_target ON bookmarks(target_type, target_id);
