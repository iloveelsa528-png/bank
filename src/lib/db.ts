import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'exam-maker.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pattern_sets (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      school_name TEXT NOT NULL DEFAULT '',
      grade       TEXT NOT NULL DEFAULT '',
      semester    TEXT NOT NULL DEFAULT '',
      exam_name   TEXT NOT NULL DEFAULT '',
      area        TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      source_job_id TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exam_patterns (
      id                   TEXT PRIMARY KEY,
      pattern_set_id       TEXT NOT NULL REFERENCES pattern_sets(id) ON DELETE CASCADE,
      question_number      INTEGER NOT NULL DEFAULT 0,
      question_type        TEXT NOT NULL DEFAULT '',
      prompt_style         TEXT NOT NULL DEFAULT '',
      choice_style         TEXT NOT NULL DEFAULT '',
      answer_basis_type    TEXT NOT NULL DEFAULT '',
      wrong_choice_pattern TEXT NOT NULL DEFAULT '',
      difficulty           TEXT NOT NULL DEFAULT '',
      intent               TEXT NOT NULL DEFAULT '',
      uses_reference_box   INTEGER NOT NULL DEFAULT 0,
      pattern_summary      TEXT NOT NULL DEFAULT '',
      created_at           TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS source_passages (
      id                        TEXT PRIMARY KEY,
      title                     TEXT NOT NULL,
      area                      TEXT NOT NULL DEFAULT '',
      source_type               TEXT NOT NULL DEFAULT '',
      passage_text              TEXT NOT NULL DEFAULT '',
      ocr_raw_text              TEXT NOT NULL DEFAULT '',
      analysis_summary          TEXT NOT NULL DEFAULT '',
      key_points                TEXT NOT NULL DEFAULT '',
      candidate_question_points TEXT NOT NULL DEFAULT '[]',
      image_urls                TEXT NOT NULL DEFAULT '[]',
      created_at                TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS question_sets (
      id                  TEXT PRIMARY KEY,
      title               TEXT NOT NULL,
      pattern_set_id      TEXT NOT NULL REFERENCES pattern_sets(id),
      source_passage_id   TEXT NOT NULL REFERENCES source_passages(id),
      generated_questions TEXT NOT NULL DEFAULT '[]',
      difficulty          TEXT NOT NULL DEFAULT '',
      area                TEXT NOT NULL DEFAULT '',
      source_job_id       TEXT,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'teacher',
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      job_id        TEXT NOT NULL,
      job_type      TEXT NOT NULL,
      model         TEXT NOT NULL,
      input_tokens  INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(job_id, model)
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id   ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_created ON usage_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_exam_patterns_set  ON exam_patterns(pattern_set_id);
    CREATE INDEX IF NOT EXISTS idx_question_sets_pattern ON question_sets(pattern_set_id);
    CREATE INDEX IF NOT EXISTS idx_question_sets_passage ON question_sets(source_passage_id);
  `);

  // 마이그레이션: 다중 지문 지원 컬럼 추가
  try { db.exec(`ALTER TABLE question_sets ADD COLUMN passages_json TEXT;`); } catch { /* 이미 존재 */ }
}

export function parseJSON<T = unknown>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try { return JSON.parse(text) as T; }
  catch { return fallback; }
}

export function stringifyJSON(value: unknown): string {
  return JSON.stringify(value ?? null);
}
