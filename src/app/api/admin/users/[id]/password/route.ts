import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { hashPassword } from '@/lib/auth';

// PATCH /api/admin/users/[id]/password — 비밀번호 재설정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json();
  const password = typeof body.password === 'string' ? body.password : '';

  if (password.length < 6) {
    return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
  }

  const { hash, salt } = hashPassword(password);
  const db = getDb();
  const result = db.prepare(
    'UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?',
  ).run(hash, salt, id);

  if (result.changes === 0) {
    return NextResponse.json({ error: '해당 사용자를 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
