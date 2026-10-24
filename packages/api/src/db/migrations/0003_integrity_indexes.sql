-- Migration 0003: Integrity indexes & legacy upgrades
--
-- Safe to run on both fresh and pre-existing databases (every statement is
-- idempotent). SQLite cannot add CHECK constraints to an existing table, so
-- databases created before 0001 gained them keep the old table definition;
-- the indexes below still enforce bookmark uniqueness and keep the hot query
-- paths fast.

-- Bookmark uniqueness for databases created without the inline UNIQUE clause.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_target_unique
  ON bookmarks(target_type, target_id);

-- Frequently filtered columns.
CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam);
CREATE INDEX IF NOT EXISTS idx_practice_tests_status ON practice_tests(status, completed_at);
CREATE INDEX IF NOT EXISTS idx_notes_event_date ON notes(event_date);
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
CREATE INDEX IF NOT EXISTS idx_revision_items_due ON revision_items(status, next_review);
