"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PatternBasedQuestionSet, PatternBasedQuestion } from "@/types/pattern-remix";
import PdfDownloadButtons from "@/components/PdfDownloadButtons";
import type { PdfData } from "@/lib/pdf/generate";

const DIFF_COLOR: Record<string, string> = {
  기본: "bg-green-100 text-green-800",
  응용: "bg-yellow-100 text-yellow-800",
  고난도: "bg-red-100 text-red-800",
};

const TYPE_COLOR: Record<string, string> = {
  내용이해: "bg-blue-100 text-blue-700",
  추론: "bg-indigo-100 text-indigo-700",
  표현분석: "bg-purple-100 text-purple-700",
  어휘문법: "bg-pink-100 text-pink-700",
  비판적사고: "bg-orange-100 text-orange-700",
  적용: "bg-cyan-100 text-cyan-700",
  서술형: "bg-gray-100 text-gray-700",
};

function toPdfData(s: PatternBasedQuestionSet): PdfData {
  const base = {
    title: s.title,
    school: s.exam_pattern_sets?.school_name,
    grade: s.exam_pattern_sets?.grade,
    area: s.area,
    patternSetTitle: s.exam_pattern_sets?.title,
    questions: s.generated_questions ?? [],
    createdAt: s.created_at,
  };
  // 다중 지문 모드 (passages_json이 있고 2개 이상)
  if (s.passages && s.passages.length > 1) {
    return { ...base, passages: s.passages };
  }
  // 단일 지문 모드 (레거시)
  return {
    ...base,
    passageTitle: s.source_passages?.title,
    passageText: s.source_passages?.passage_text,
    passageImageUrls: s.source_passages?.image_urls,
    keyPoints: s.source_passages?.key_points,
  };
}

export default function PBQLibraryPage() {
  const [sets, setSets] = useState<PatternBasedQuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");

  useEffect(() => {
    fetch("/api/pattern-based-questions")
      .then(r => r.json())
      .then(d => { setSets(d.questionSets ?? []); setLoading(false); });
  }, []);

  async function del(id: string) {
    if (!confirm("이 문제 세트를 삭제하시겠습니까?")) return;
    setDeleting(id);
    await fetch(`/api/pattern-based-questions/${id}`, { method: "DELETE" });
    setSets(prev => prev.filter(s => s.id !== id));
    setDeleting(null);
    if (expanded === id) setExpanded(null);
  }

  const filtered = useMemo(() => {
    let list = sets;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.exam_pattern_sets?.title ?? "").toLowerCase().includes(q) ||
        (s.source_passages?.title ?? "").toLowerCase().includes(q) ||
        (s.area ?? "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === "oldest") return a.created_at.localeCompare(b.created_at);
      if (sortBy === "name") return a.title.localeCompare(b.title, "ko");
      return b.created_at.localeCompare(a.created_at);
    });
  }, [sets, search, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/pattern-remix/generate" className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-base font-bold text-gray-900">저장된 문제지</h1>
              <p className="text-xs text-gray-400">생성한 문제지를 다운로드하거나 편집합니다</p>
            </div>
          </div>
          <span className="text-sm text-gray-500 font-medium">
            {filtered.length !== sets.length ? `${filtered.length} / ` : ""}{sets.length}개
          </span>
        </div>
        {sets.length > 2 && (
          <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="제목, 패턴, 지문으로 검색…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 focus:bg-white"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 focus:outline-none focus:border-green-400"
            >
              <option value="newest">최신순</option>
              <option value="oldest">오래된순</option>
              <option value="name">이름순</option>
            </select>
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-4">
        {sets.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <p className="text-lg mb-2">저장된 문제 세트 없음</p>
            <Link href="/pattern-remix/generate" className="text-green-600 hover:underline text-sm">
              문제 생성하러 가기
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
            <p className="mb-2">검색 결과가 없습니다</p>
            <button onClick={() => setSearch("")} className="text-sm text-green-600 hover:underline">
              검색 초기화
            </button>
          </div>
        ) : filtered.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* 헤더 */}
            <div className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{s.title}</h3>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  <span className="text-xs text-green-600">
                    패턴: {s.exam_pattern_sets?.title ?? s.pattern_set_id}
                  </span>
                  <span className="text-xs text-green-600">
                    {s.passages && s.passages.length > 1
                      ? `지문 ${s.passages.length}개`
                      : `지문: ${s.source_passages?.title ?? s.source_passage_id}`}
                  </span>
                  {s.area && <span className="text-xs text-gray-500">영역: {s.area}</span>}
                  <span className="text-xs text-gray-400">
                    {new Date(s.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  문제 {s.generated_questions?.length ?? 0}개
                </p>
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <PdfDownloadButtons data={toPdfData(s)} />
                  <Link
                    href={`/pattern-remix/generate?pattern=${s.pattern_set_id}`}
                    className="text-xs text-gray-400 hover:text-green-600 transition-colors"
                  >
                    이 패턴으로 재생성 →
                  </Link>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                <button
                  onClick={() => { setExpanded(expanded === s.id ? null : s.id); setExpandedQ(null); }}
                  className="text-sm text-green-600 border border-green-200 px-3 py-1.5 rounded hover:bg-green-50"
                >
                  {expanded === s.id ? "접기" : "문제 보기"}
                </button>
                <Link
                  href={`/pattern-remix/generate/${s.id}/edit`}
                  className="text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50"
                >
                  편집
                </Link>
                <button
                  onClick={() => del(s.id)}
                  disabled={deleting === s.id}
                  className="text-sm text-red-500 border border-red-200 px-3 py-1.5 rounded hover:bg-red-50 disabled:opacity-40"
                >
                  {deleting === s.id ? "삭제 중…" : "삭제"}
                </button>
              </div>
            </div>

            {/* 문제 목록 */}
            {expanded === s.id && (
              <div className="border-t bg-gray-50">
                {(s.generated_questions ?? []).map((q: PatternBasedQuestion, i: number) => (
                  <div key={i} className="border-b last:border-0">
                    <button
                      className="w-full text-left p-3 hover:bg-white transition"
                      onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 font-mono text-sm shrink-0">{q.question_number}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex gap-1.5 mb-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[q.question_type] ?? "bg-gray-100 text-gray-700"}`}>
                              {q.question_type}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLOR[q.difficulty] ?? "bg-gray-100 text-gray-700"}`}>
                              {q.difficulty}
                            </span>
                            {q.answer === 0 && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">서술형</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-900 leading-snug">{q.question_text}</p>
                          {q.pattern_reference && (
                            <p className="text-xs text-gray-400 mt-0.5">패턴 참조: {q.pattern_reference}</p>
                          )}
                        </div>
                        <span className="text-gray-400 text-xs shrink-0">{expandedQ === i ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {expandedQ === i && (
                      <div className="bg-white border-t p-4 space-y-3">
                        {q.choices.length > 0 && (
                          <div className="space-y-2">
                            {q.choices.map((c, ci) => (
                              <div
                                key={ci}
                                className={`p-2 rounded text-sm border ${c.is_correct ? "border-green-300 bg-green-50" : "border-gray-200"}`}
                              >
                                <div className="flex gap-2">
                                  <span className={`font-medium shrink-0 ${c.is_correct ? "text-green-700" : "text-gray-600"}`}>
                                    {c.number}.
                                  </span>
                                  <div>
                                    <p className={c.is_correct ? "text-green-800" : "text-gray-800"}>{c.text}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{c.reason}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {q.answer === 0 && q.descriptive_answer && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-xs font-semibold text-blue-700 mb-1">모범 답안</p>
                            <p className="text-sm text-blue-900 whitespace-pre-wrap">{q.descriptive_answer}</p>
                          </div>
                        )}
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-xs font-semibold text-yellow-700 mb-1">해설</p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{q.explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
