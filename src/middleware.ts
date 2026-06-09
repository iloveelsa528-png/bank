import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareSupabase } from "@/lib/supabase-server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareSupabase(request, response);

  // 세션 갱신 (토큰 만료 시 자동 refresh)
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 로그인 페이지 / 콜백은 항상 접근 허용
  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
    // 이미 로그인된 상태면 홈으로
    if (user && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // API 라우트는 미들웨어에서 막지 않음 (각 라우트에서 처리 가능)
  if (pathname.startsWith("/api")) {
    return response;
  }

  // 비로그인 상태면 /login으로
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
