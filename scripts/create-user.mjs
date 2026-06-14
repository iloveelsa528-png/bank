#!/usr/bin/env node
/**
 * 강사/관리자 계정 생성 스크립트
 *
 * 사용법:
 *   node scripts/create-user.mjs <username> <password> <role>
 *   node scripts/create-user.mjs iloveelsa528@gmail.com MyPass123 admin
 *
 * role 생략 시 기본값: teacher
 */

import crypto from 'crypto';
import Database from 'better-sqlite3';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '..', 'data', 'exam-maker.db');

// ── DB 연결 & users 테이블 보장 ────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'teacher',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── scrypt 해싱 (src/lib/auth.ts 와 동일 파라미터) ─────────────────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto
    .scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
    .toString('hex');
  return { hash, salt };
}

// ── 대화형 입력 ──────────────────────────────────────────────────────────────
function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

// ── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  const [,, argUsername, argPassword, argRole] = process.argv;

  let username = argUsername?.trim() ?? '';
  let password = argPassword ?? '';
  let role     = argRole?.trim() ?? '';

  // 누락된 항목만 대화형으로 보완
  if (!username || !password || !role) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!username) username = (await ask(rl, 'username: ')).trim();
    if (!password) password = (await ask(rl, 'password: ')).trim();
    if (!role)     role     = (await ask(rl, 'role (admin/teacher) [teacher]: ')).trim() || 'teacher';
    rl.close();
  }

  if (!username) { console.error('오류: username을 입력하세요.'); process.exit(1); }
  if (!password) { console.error('오류: password를 입력하세요.');  process.exit(1); }
  if (!['admin', 'teacher'].includes(role)) {
    console.error(`오류: role은 'admin' 또는 'teacher'만 허용됩니다. 입력값: "${role}"`);
    process.exit(1);
  }

  // 중복 확인
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    console.error(`오류: username "${username}" 이 이미 존재합니다. 덮어쓰지 않습니다.`);
    process.exit(1);
  }

  const { hash, salt } = hashPassword(password);
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO users (id, username, password_hash, password_salt, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, username, hash, salt, role);

  console.log('\n✅ 계정 생성 완료');
  console.log(`   id:       ${id}`);
  console.log(`   username: ${username}`);
  console.log(`   role:     ${role}`);
  console.log(`   hash:     ${hash.slice(0, 16)}... (${hash.length / 2} bytes)\n`);
}

main().catch(err => {
  console.error('오류:', err.message);
  process.exit(1);
});
