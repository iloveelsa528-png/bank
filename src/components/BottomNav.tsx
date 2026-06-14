"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const TABS = [
  {
    href: "/",
    label: "홈",
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? "text-green-600" : "text-gray-400"}`}
        fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2}
          d={active
            ? "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            : "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"} />
      </svg>
    ),
  },
  {
    href: "/pattern-remix/generate",
    label: "문제 만들기",
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? "text-green-600" : "text-gray-400"}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    href: "/pattern-remix/generate/library",
    label: "저장된 문제지",
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? "text-green-600" : "text-gray-400"}`}
        fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2}
          d={active
            ? "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            : "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"} />
      </svg>
    ),
  },
];

const ADMIN_TAB = {
  href: "/admin",
  label: "관리",
  icon: (active: boolean) => (
    <svg className={`w-5 h-5 ${active ? "text-green-600" : "text-gray-400"}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94
           3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724
           1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572
           1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31
           -.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724
           1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z
           M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

export default function BottomNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (pathname === "/login") {
      setIsAdmin(false);
      return;
    }
    fetch("/api/auth/me")
      .then(res => (res.ok ? res.json() : null))
      .then(data => { setIsAdmin(data?.role === "admin"); })
      .catch(() => { setIsAdmin(false); });
  }, [pathname]);

  // 로그인 화면에서는 네비게이션 숨김
  if (pathname === "/login") return null;

  const tabs = isAdmin ? [...TABS, ADMIN_TAB] : TABS;

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAdmin(false);
    router.push('/login');
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/");
    if (href === "/pattern-remix/generate") {
      return pathname.startsWith("/pattern-remix/generate") && !pathname.startsWith("/pattern-remix/generate/library");
    }
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-inset-bottom">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(tab => {
          const active = isActive(tab.href);
          return (
            <Link key={tab.href} href={tab.href}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors">
              {tab.icon(active)}
              <span className={`text-[10px] font-medium ${active ? "text-green-600" : "text-gray-400"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* 로그아웃 */}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors text-gray-400 hover:text-red-500"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-[10px] font-medium">로그아웃</span>
        </button>
      </div>
    </nav>
  );
}
