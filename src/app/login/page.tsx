"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError   ] = useState("");
  const [loading,  setLoading ] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "로그인 실패");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-green-600 flex items-center justify-center mb-3">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13
                   C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13
                   C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13
                   C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">국어 문제은행</h1>
          <p className="text-sm text-gray-500 mt-0.5">강사 로그인</p>
        </div>

        {/* 폼 */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              아이디
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
              placeholder="아이디를 입력하세요"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="비밀번호를 입력하세요"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2.5 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400
                       text-white font-semibold py-2.5 rounded-xl transition-colors mt-1"
          >
            {loading ? "로그인 중…" : "로그인"}
          </button>
        </form>

      </div>
    </div>
  );
}
