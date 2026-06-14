import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { createSession, SESSION_COOKIE } from '@/lib/session';

const GENERIC_ERR = '아이디 또는 비밀번호가 올바르지 않습니다.';
const TTL_SECONDS  = 7 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password        : '';

    if (!username || !password) {
      return NextResponse.json({ error: '아이디와 비밀번호를 입력하세요.' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare(
      'SELECT id, username, password_hash, password_salt, role FROM users WHERE username = ?',
    ).get(username) as {
      id: string; username: string;
      password_hash: string; password_salt: string; role: string;
    } | undefined;

    // 사용자 없어도 동일 연산 수행 → 타이밍 공격 방지
    if (!user) {
      verifyPassword(password, 'a'.repeat(128), 'b'.repeat(64));
      return NextResponse.json({ error: GENERIC_ERR }, { status: 401 });
    }

    if (!verifyPassword(password, user.password_hash, user.password_salt)) {
      return NextResponse.json({ error: GENERIC_ERR }, { status: 401 });
    }

    const token = createSession(user.id);

    const res = NextResponse.json({ ok: true, role: user.role, username: user.username });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly:  true,
      sameSite:  'lax',
      path:      '/',
      maxAge:    TTL_SECONDS,
      secure:    process.env.NODE_ENV === 'production',
    });
    return res;
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
