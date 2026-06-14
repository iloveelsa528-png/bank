import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// DELETE /api/admin/users/[id] — 강사 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
  }

  const { id } = await params;

  if (id === admin.id) {
    return NextResponse.json({ error: '자기 자신은 삭제할 수 없습니다.' }, { status: 400 });
  }

  const db = getDb();
  // role != 'admin' 조건으로 관리자 계정은 삭제 불가
  const result = db.prepare(
    "DELETE FROM users WHERE id = ? AND role != 'admin'",
  ).run(id);

  if (result.changes === 0) {
    return NextResponse.json(
      { error: '삭제할 수 없습니다. 존재하지 않거나 관리자 계정입니다.' },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
