"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AuthUserMenu from "@/components/AuthUserMenu";
import { ExamPatternSet } from "@/types/patterns";

const AREA_BADGE: Record<string, string> = {
  문학: "bg-purple-100 text-purple-700",
  독서: "bg-blue-100 text-blue-700",
  문법: "bg-green-100 text-green-700",
  화작: "bg-orange-100 text-orange-700",
  기타: "bg-gray-100 text-gray-600",
};

function Spinner() {
  return (
    <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function PatternLibraryPage() {
  const [patternSets, setPatternSets] = useState<ExamPatternSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pattern-sets")
      .then((r) => r.json())
      .then((d) => setPatternSets(d.patternSets ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("이 패턴 세트를 삭제하시겠습니까?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/pattern-sets/${id}`, { method: "DELETE" });
      setPatternSets((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/pattern-remix" className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">패턴 라이브러리</h1>
            <p className="text-xs text-gray-500 -mt-0.5">저장된 기출 패턴 세트 목록</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/pattern-remix"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              새 패턴 추출
            </Link>
            <Link href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              문제은행
            </Link>
            <AuthUserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner /></div>
        ) : patternSets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">저장된 패턴 세트가 없습니다.</p>
            <Link href="/pattern-remix" className="text-sm text-purple-600 hover:underline">첫 번째 패턴 추출하기</Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500">{patternSets.length}개 패턴 세트</p>
            {patternSets.map((ps) => (
              <div key={ps.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* 헤더 */}
                <div className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {ps.area && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${AREA_BADGE[ps.area] ?? "bg-gray-100 text-gray-600"}`}>
                          {ps.area}
                        </span>
                      )}
                      {ps.grade && <span className="text-xs text-gray-500">{ps.grade}</span>}
                      {ps.semester && <span className="text-xs text-gray-500">{ps.semester}</span>}
                      {ps.exam_name && <span className="text-xs text-gray-500">{ps.exam_name}</span>}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{ps.title}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      {ps.school_name && <span className="text-xs text-gray-500">{ps.school_name}</span>}
                      <span className="text-xs text-gray-400">{new Date(ps.created_at).toLocaleDateString("ko-KR")}</span>
                      {ps.exam_patterns && (
                        <span className="text-xs text-purple-600 font-medium">{ps.exam_patterns.length}문항 패턴</span>
                      )}
                    </div>
                    {ps.description && <p className="text-xs text-gray-500 mt-1">{ps.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setExpanded((v) => v === ps.id ? null : ps.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors">
                      {expanded === ps.id ? "닫기" : "패턴 보기"}
                    </button>
                    <button
                      onClick={() => handleDelete(ps.id)}
                      disabled={deleting === ps.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50">
                      {deleting === ps.id ? "삭제 중..." : "삭제"}
                    </button>
                  </div>
                </div>

                {/* 패턴 상세 */}
                {expanded === ps.id && ps.exam_patterns && ps.exam_patterns.length > 0 && (
                  <div className="border-t border-gray-100 px-5 py-4 flex flex-col gap-3">
                    {ps.exam_patterns.map((p) => (
                      <div key={p.id} className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">{p.question_number}</span>
                          <span className="text-sm font-semibold text-gray-800">{p.question_number}번</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{p.question_type}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            p.difficulty === "기본" ? "bg-green-100 text-green-700" :
                            p.difficulty === "응용" ? "bg-orange-100 text-orange-700" :
                            "bg-red-100 text-red-700"
                          }`}>{p.difficulty}</span>
                          {p.uses_reference_box && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">보기</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <InfoRow label="발문 방식" value={p.prompt_style} />
                          <InfoRow label="선택지 구성" value={p.choice_style} />
                          <InfoRow label="정답 근거" value={p.answer_basis_type} />
                          <InfoRow label="오답 패턴" value={p.wrong_choice_pattern} />
                        </div>
                        <div className="bg-white border border-purple-100 rounded-lg px-3 py-2">
                          <p className="text-xs font-semibold text-purple-600 mb-0.5">패턴 요약</p>
                          <p className="text-xs text-gray-700 leading-relaxed">{p.pattern_summary}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-semibold text-gray-500 mb-0.5">{label}</p>
      <p className="text-gray-700 leading-relaxed">{value}</p>
    </div>
  );
}
