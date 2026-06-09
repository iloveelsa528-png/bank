"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ExamPatternSet } from "@/types/patterns";
import { SourcePassage } from "@/types/passages";
import { PatternBasedQuestion, PatternBasedQuestionSet } from "@/types/pattern-remix";

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

export default function GeneratePage() {
  const [patternSets, setPatternSets] = useState<ExamPatternSet[]>([]);
  const [passages, setPassages] = useState<SourcePassage[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<ExamPatternSet | null>(null);
  const [selectedPassage, setSelectedPassage] = useState<SourcePassage | null>(null);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<PatternBasedQuestion[]>([]);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/pattern-sets").then(r => r.json()),
      fetch("/api/source-passages").then(r => r.json()),
    ]).then(([ps, sp]) => {
      setPatternSets(ps.patternSets ?? []);
      setPassages(sp.passages ?? []);
    });
  }, []);

  async function generate() {
    if (!selectedPattern || !selectedPassage) {
      setError("패턴 세트와 지문을 모두 선택하세요.");
      return;
    }
    setError("");
    setGenerating(true);
    setQuestions([]);
    setSavedId(null);
    setSaveTitle(`${selectedPassage.title} × ${selectedPattern.title}`);
    try {
      const res = await fetch("/api/pattern-remix/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pattern_set_id: selectedPattern.id,
          source_passage_id: selectedPassage.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(data.questions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 중 오류 발생");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!saveTitle.trim()) { setError("제목을 입력하세요."); return; }
    if (!selectedPattern || !selectedPassage) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/pattern-based-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: saveTitle.trim(),
          pattern_set_id: selectedPattern.id,
          source_passage_id: selectedPassage.id,
          generated_questions: questions,
          difficulty: "",
          area: selectedPassage.area ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedId(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/pattern-remix" className="text-purple-600 hover:text-purple-800 text-sm">← 패턴 추출</Link>
          <h1 className="text-xl font-bold text-gray-900">패턴 기반 문제 생성</h1>
        </div>
        <Link
          href="/pattern-remix/generate/library"
          className="text-sm bg-purple-100 text-purple-700 px-3 py-1.5 rounded hover:bg-purple-200"
        >
          저장된 문제 보기
        </Link>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Col 1: 패턴 세트 선택 */}
        <div className="w-[28%] border-r bg-white flex flex-col">
          <div className="p-4 border-b bg-purple-50">
            <h2 className="font-semibold text-purple-800 text-sm">① 기출 패턴 세트 선택</h2>
            <p className="text-xs text-gray-500 mt-0.5">{patternSets.length}개 저장됨</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {patternSets.length === 0 ? (
              <div className="text-center text-gray-400 text-sm pt-12">
                <p>저장된 패턴 세트 없음</p>
                <Link href="/pattern-remix" className="text-purple-600 hover:underline text-xs mt-2 block">
                  패턴 추출하러 가기
                </Link>
              </div>
            ) : patternSets.map(ps => (
              <button
                key={ps.id}
                onClick={() => setSelectedPattern(ps)}
                className={`w-full text-left p-3 rounded-lg border text-sm transition ${
                  selectedPattern?.id === ps.id
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/50"
                }`}
              >
                <p className="font-medium text-gray-900 leading-tight">{ps.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {ps.school_name} · {ps.grade} · {ps.exam_name}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  패턴 {ps.exam_patterns?.length ?? 0}개
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Col 2: 지문 선택 */}
        <div className="w-[28%] border-r bg-white flex flex-col">
          <div className="p-4 border-b bg-teal-50">
            <h2 className="font-semibold text-teal-800 text-sm">② 새 지문 선택</h2>
            <p className="text-xs text-gray-500 mt-0.5">{passages.length}개 저장됨</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {passages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm pt-12">
                <p>저장된 지문 없음</p>
                <Link href="/source-passages" className="text-teal-600 hover:underline text-xs mt-2 block">
                  지문 등록하러 가기
                </Link>
              </div>
            ) : passages.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPassage(p)}
                className={`w-full text-left p-3 rounded-lg border text-sm transition ${
                  selectedPassage?.id === p.id
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-teal-300 hover:bg-teal-50/50"
                }`}
              >
                <p className="font-medium text-gray-900 leading-tight">{p.title}</p>
                <p className="text-xs text-gray-500 mt-1">{p.area} · {p.source_type}</p>
                <p className="text-xs text-teal-600 mt-1 line-clamp-2">{p.analysis_summary?.slice(0, 80)}{p.analysis_summary?.length > 80 ? "…" : ""}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Col 3: 생성 + 결과 */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm">③ 문제 생성 및 저장</h2>
            <button
              onClick={generate}
              disabled={generating || !selectedPattern || !selectedPassage}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg font-medium hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {generating ? "생성 중…" : "문제 생성"}
            </button>
          </div>

          {/* 선택 요약 */}
          <div className="px-4 py-2 border-b bg-gray-50/50 flex gap-4 text-xs text-gray-600">
            <span>패턴: <span className="font-medium text-purple-700">{selectedPattern?.title ?? "미선택"}</span></span>
            <span>지문: <span className="font-medium text-teal-700">{selectedPassage?.title ?? "미선택"}</span></span>
          </div>

          {error && (
            <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            {generating && (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">Claude Opus로 문제 생성 중… (약 30~60초)</p>
              </div>
            )}

            {!generating && questions.length === 0 && !savedId && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm gap-2">
                <p>패턴 세트와 지문을 선택하고</p>
                <p>「문제 생성」을 클릭하세요</p>
              </div>
            )}

            {questions.length > 0 && (
              <div className="space-y-3 mb-6">
                {questions.map((q, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      className="w-full text-left p-3 hover:bg-gray-50 transition"
                      onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 font-mono text-sm shrink-0">
                          {q.question_number}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex gap-1.5 mb-1.5 flex-wrap">
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
                          <p className="text-sm text-gray-900 font-medium leading-snug line-clamp-2">
                            {q.question_text}
                          </p>
                          {q.pattern_reference && (
                            <p className="text-xs text-purple-600 mt-1">패턴 참조: {q.pattern_reference}</p>
                          )}
                        </div>
                        <span className="text-gray-400 text-xs shrink-0">
                          {expandedQ === i ? "▲" : "▼"}
                        </span>
                      </div>
                    </button>

                    {expandedQ === i && (
                      <div className="border-t bg-gray-50 p-4 space-y-3">
                        {/* 선택지 */}
                        {q.choices.length > 0 && (
                          <div className="space-y-2">
                            {q.choices.map((c) => (
                              <div
                                key={c.number}
                                className={`p-2 rounded text-sm border ${c.is_correct ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"}`}
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

                        {/* 서술형 모범 답안 */}
                        {q.answer === 0 && q.descriptive_answer && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-xs font-semibold text-blue-700 mb-1">모범 답안</p>
                            <p className="text-sm text-blue-900 whitespace-pre-wrap">{q.descriptive_answer}</p>
                          </div>
                        )}

                        {/* 해설 */}
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

            {/* 저장 폼 */}
            {questions.length > 0 && !savedId && (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">문제 세트 저장</p>
                <div className="flex gap-2">
                  <input
                    value={saveTitle}
                    onChange={e => setSaveTitle(e.target.value)}
                    placeholder="문제 세트 제목"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <button
                    onClick={save}
                    disabled={saving}
                    className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-40 transition font-medium"
                  >
                    {saving ? "저장 중…" : "저장"}
                  </button>
                </div>
              </div>
            )}

            {savedId && (
              <div className="border border-green-300 bg-green-50 rounded-lg p-4 text-center">
                <p className="text-green-700 font-semibold">저장 완료!</p>
                <div className="flex gap-2 justify-center mt-3">
                  <Link
                    href="/pattern-remix/generate/library"
                    className="text-sm text-purple-600 border border-purple-300 px-3 py-1.5 rounded hover:bg-purple-50"
                  >
                    저장된 문제 목록
                  </Link>
                  <button
                    onClick={() => { setQuestions([]); setSavedId(null); setSelectedPattern(null); setSelectedPassage(null); }}
                    className="text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50"
                  >
                    새로 생성
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
