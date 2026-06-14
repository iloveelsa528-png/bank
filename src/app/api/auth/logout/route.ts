import { NextRequest, NextResponse } from 'next/server';
import { destroySession, SESSION_COOKIE } from '@/lib/session';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) destroySession(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
