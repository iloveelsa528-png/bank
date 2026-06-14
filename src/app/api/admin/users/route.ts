import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { hashPassword } from '@/lib/auth';

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') return null;
  return user;
}

// GET /api/admin/users — 강사 목록 (비밀번호 컬럼 제외)
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
  }

  const db = getDb();
  const users = db.prepare(
    'SELECT id, username, role, created_at FROM users ORDER BY created_at ASC',
  ).all();

  return NextResponse.json({ users });
}

// POST /api/admin/users — 강사 추가 (role 고정: teacher)
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
  }

  const body = await request.json();
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username) {
    return NextResponse.json({ error: '아이디를 입력하세요.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return NextResponse.json({ error: '이미 존재하는 아이디입니다.' }, { status: 409 });
  }

  const { hash, salt } = hashPassword(password);
  const id = randomUUID();
  db.prepare(
    'INSERT INTO users (id, username, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)',
  ).run(id, username, hash, salt, 'teacher');

  return NextResponse.json({ ok: true, id, username, role: 'teacher' }, { status: 201 });
}
