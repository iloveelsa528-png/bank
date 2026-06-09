"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Problem } from "@/types/index";
import AuthUserMenu from "@/components/AuthUserMenu";

const AREAS = ["", "문학", "독서", "문법", "화작", "기타"];
const GRADES = ["", "고1", "고2", "고3", "중1", "중2", "중3"];
const DIFFICULTIES = ["", "기본", "응용", "고난도", "혼합"];

const AREA_BADGE: Record<string, string> = {
  문학: "bg-purple-100 text-purple-700",
  독서: "bg-blue-100 text-blue-700",
  문법: "bg-green-100 text-green-700",
  화작: "bg-orange-100 text-orange-700",
  기타: "bg-gray-100 text-gray-600",
};

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [area, setArea] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  // 텍스트 입력은 400ms 디바운스 적용
  const [debouncedQ, setDebouncedQ] = useState("");
  const [debouncedSchool, setDebouncedSchool] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSchool(school), 400);
    return () => clearTimeout(t);
  }, [school]);

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (debouncedSchool) params.set("school", debouncedSchool);
    if (grade) params.set("grade", grade);
    if (area) params.set("area", area);
    if (difficulty) params.set("difficulty", difficulty);
    try {
      const res = await fetch(`/api/problems?${params}`);
      const data = await res.json();
      setProblems(data.problems ?? []);
    } catch {
      setProblems([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, debouncedSchool, grade, area, difficulty]);

  useEffect(() => { fetchProblems(); }, [fetchProblems]);

  const handleDelete = async (id: string) => {
    if (!confirm("이 문제를 삭제하시겠습니까?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/problems/${id}`, { method: "DELETE" });
      setProblems((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">문제은행</h1>
            <p className="text-xs text-gray-500 -mt-0.5">저장된 문제 목록</p>
          </div>
          <Link href="/"
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 문제 추가
          </Link>
          <AuthUserMenu />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-5">
        {/* 검색 필터 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">제목 검색</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="제목으로 검색..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="min-w-[130px]">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">학교명</label>
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="학교명..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">학년</label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:border-blue-500">
              {GRADES.map((g) => <option key={g} value={g}>{g || "전체"}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">영역</label>
            <select value={area} onChange={(e) => setArea(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:border-blue-500">
              {AREAS.map((a) => <option key={a} value={a}>{a || "전체"}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">난이도</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:border-blue-500">
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d || "전체"}</option>)}
            </select>
          </div>
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : problems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">저장된 문제가 없습니다.</p>
            <Link href="/" className="text-sm text-blue-600 hover:underline">새 문제 추가하기</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-500">{problems.length}개 문제</p>
            {problems.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-start gap-4 hover:border-blue-200 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {p.subject_area && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${AREA_BADGE[p.subject_area] ?? "bg-gray-100 text-gray-600"}`}>
                        {p.subject_area}
                      </span>
                    )}
                    {p.difficulty && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-600">
                        {p.difficulty}
                      </span>
                    )}
                    {p.grade && <span className="text-xs text-gray-500">{p.grade}</span>}
                    {p.school_name && <span className="text-xs text-gray-500">{p.school_name}</span>}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{p.title}</h3>
                  {p.unit_name && <p className="text-xs text-gray-500 mt-0.5">{p.unit_name}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(p.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/problems/${p.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                    상세 보기
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deleting === p.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50">
                    {deleting === p.id ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
