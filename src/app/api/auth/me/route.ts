import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';

// GET /api/auth/me — 현재 로그인 사용자 정보 (id/username/role만, 민감정보 제외)
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(null, { status: 401 });
  }
  return NextResponse.json({ id: user.id, username: user.username, role: user.role });
}
