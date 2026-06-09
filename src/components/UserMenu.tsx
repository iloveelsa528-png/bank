"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

interface Props {
  email: string;
  avatarUrl?: string;
}

export default function UserMenu({ email, avatarUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setLoading(true);
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initial = email.charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="avatar" className="w-7 h-7 rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
            {initial}
          </div>
        )}
        <span className="text-xs text-gray-600 max-w-[120px] truncate hidden sm:block">{email}</span>
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20 min-w-[160px]">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-500 truncate">{email}</p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {loading ? "로그아웃 중..." : "로그아웃"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
