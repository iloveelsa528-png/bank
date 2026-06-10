import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareSupabase } from "@/lib/supabase-server";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareSupabase(request, response);

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // 로그인 / 콜백 / 공유 페이지는 인증 없이 허용
  if (pathname.startsWith("/login") || pathname.startsWith("/auth") || pathname.startsWith("/share")) {
    if (user && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // API 라우트는 각 핸들러에서 인증 처리
  if (pathname.startsWith("/api")) {
    return response;
  }

  // 비로그인이면 /login으로
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
