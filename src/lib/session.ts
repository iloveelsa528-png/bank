import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { getDb } from './db';

export const SESSION_COOKIE = 'session_token';
const TTL_DAYS = 7;

export interface SessionUser {
  id: string;
  username: string;
  role: string;
}

// 세션 생성 — 토큰 반환
export function createSession(userId: string): string {
  const db = getDb();
  const token = randomUUID();
  const expires = new Date();
  expires.setDate(expires.getDate() + TTL_DAYS);

  db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
  ).run(token, userId, expires.toISOString());

  return token;
}

// 현재 요청 쿠키에서 세션 읽기 — 유효하면 user 반환, 아니면 null
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const row = db.prepare(`
    SELECT s.id AS token, s.expires_at,
           u.id, u.username, u.role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `).get(token) as {
    token: string; expires_at: string;
    id: string; username: string; role: string;
  } | undefined;

  if (!row) return null;

  // 만료된 세션 즉시 삭제
  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(token);
    return null;
  }

  return { id: row.id, username: row.username, role: row.role };
}

// 세션 삭제 (로그아웃)
export function destroySession(token: string): void {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(token);
}
