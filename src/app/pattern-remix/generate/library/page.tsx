"use client";
import { useState, useEffect } from "react";
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
  return {
    title: s.title,
    school: s.exam_pattern_sets?.school_name,
    grade: s.exam_pattern_sets?.grade,
    area: s.area,
    patternSetTitle: s.exam_pattern_sets?.title,
    passageTitle: s.source_passages?.title,
    passageText: s.source_passages?.passage_text,
    passageImageUrls: s.source_passages?.image_urls,
    keyPoints: s.source_passages?.key_points,
    questions: s.generated_questions ?? [],
    createdAt: s.created_at,
  };
}

export default function PBQLibraryPage() {
  const [sets, setSets] = useState<PatternBasedQuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/pattern-remix/generate" className="text-purple-600 hover:text-purple-800 text-sm">← 문제 생성</Link>
          <h1 className="text-xl font-bold text-gray-900">재구성 문제 라이브러리</h1>
        </div>
        <span className="text-sm text-gray-500">{sets.length}개 저장됨</span>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-4">
        {sets.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <p className="text-lg mb-2">저장된 문제 세트 없음</p>
            <Link href="/pattern-remix/generate" className="text-purple-600 hover:underline text-sm">
              문제 생성하러 가기
            </Link>
          </div>
        ) : sets.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* 헤더 */}
            <div className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{s.title}</h3>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  <span className="text-xs text-purple-600">
                    패턴: {s.exam_pattern_sets?.title ?? s.pattern_set_id}
                  </span>
                  <span className="text-xs text-teal-600">
                    지문: {s.source_passages?.title ?? s.source_passage_id}
                  </span>
                  {s.area && <span className="text-xs text-gray-500">영역: {s.area}</span>}
                  <span className="text-xs text-gray-400">
                    {new Date(s.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  문제 {s.generated_questions?.length ?? 0}개
                </p>
                <div className="mt-2">
                  <PdfDownloadButtons data={toPdfData(s)} />
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { setExpanded(expanded === s.id ? null : s.id); setExpandedQ(null); }}
                  className="text-sm text-purple-600 border border-purple-200 px-3 py-1.5 rounded hover:bg-purple-50"
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
                            <p className="text-xs text-purple-500 mt-0.5">패턴 참조: {q.pattern_reference}</p>
                          )}
                        </div>
                        <span className="text-gray-400 text-xs shrink-0">{expandedQ === i ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {expandedQ === i && (
                      <div className="bg-white border-t p-4 space-y-3">
                        {q.choices.length > 0 && (
                          <div className="space-y-2">
                            {q.choices.map(c => (
                              <div
                                key={c.number}
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
