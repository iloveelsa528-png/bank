import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'session_token';

// 인증 없이 통과시키는 경로 (prefix 일치)
const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/health',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    p => pathname === p || pathname.startsWith(p + '/'),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    // API 요청 → redirect 대신 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    // 페이지 요청 → /login 리다이렉트
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // _next 내부, 정적 파일, 이미지, favicon 은 middleware 자체를 건너뜀
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
