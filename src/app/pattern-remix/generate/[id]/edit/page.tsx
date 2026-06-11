"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { PatternBasedQuestion, PatternBasedQuestionSet } from "@/types/pattern-remix";
import PdfDownloadButtons from "@/components/PdfDownloadButtons";
import type { PdfData } from "@/lib/pdf/generate";

function PassageCard({ title, text }: { title?: string; text: string }) {
  const [open, setOpen] = useState(false);
  const preview = text.slice(0, 120) + (text.length > 120 ? "…" : "");
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-100/50 transition"
      >
        <span className="text-sm font-semibold text-amber-800">
          📖 지문{title ? ` — ${title}` : ""}
        </span>
        <svg
          className={`w-4 h-4 text-amber-600 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {!open && (
        <p className="px-4 pb-3 text-xs text-amber-700 leading-relaxed">{preview}</p>
      )}
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
      )}
    </div>
  );
}

const DIFF_OPTIONS = ["기본", "응용", "고난도"];
const TYPE_OPTIONS = ["내용이해", "추론", "표현분석", "어휘문법", "비판적사고", "적용", "서술형"];

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

interface EditState {
  q: PatternBasedQuestion;
  excluded: boolean;
  reviewed: boolean;
  editing: boolean;
}

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [questionSet, setQuestionSet] = useState<PatternBasedQuestionSet | null>(null);
  const [title, setTitle] = useState("");
  const [states, setStates] = useState<EditState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/pattern-based-questions/${id}`)
      .then(r => r.json())
      .then(d => {
        const qs: PatternBasedQuestionSet = d.questionSet;
        setQuestionSet(qs);
        setTitle(qs.title);
        setStates((qs.generated_questions ?? []).map((q: PatternBasedQuestion) => ({
          q, excluded: false, reviewed: false, editing: false,
        })));
        setLoading(false);
      });
  }, [id]);

  function update(idx: number, patch: Partial<EditState>) {
    setStates(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
    setSaved(false);
  }

  function updateChoice(qIdx: number, cIdx: number, field: "text" | "reason" | "is_correct", val: string | boolean) {
    setStates(prev => prev.map((s, i) => {
      if (i !== qIdx) return s;
      const choices = s.q.choices.map((c, ci) => {
        if (field === "is_correct") return { ...c, is_correct: ci === cIdx };
        return ci === cIdx ? { ...c, [field]: val } : c;
      });
      const answer = field === "is_correct" ? s.q.choices[cIdx].number : s.q.answer;
      return { ...s, q: { ...s.q, choices, answer } };
    }));
    setSaved(false);
  }

  async function saveAll() {
    const finalQuestions = states
      .filter(s => !s.excluded)
      .map((s, idx) => ({ ...s.q, question_number: idx + 1 }));
    if (finalQuestions.length === 0) { setError("채택된 문항이 없습니다."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/pattern-based-questions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, generated_questions: finalQuestions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!questionSet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        문제 세트를 찾을 수 없습니다.
      </div>
    );
  }

  const adopted = states.filter(s => !s.excluded).length;
  const reviewed = states.filter(s => s.reviewed && !s.excluded).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/pattern-remix/generate/library"
            className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            목록
          </Link>
          <h1 className="text-base font-bold text-gray-900">문제 세트 편집</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 hidden sm:inline">
            채택 {adopted}/{states.length} · 검수 {reviewed}
          </span>
          {questionSet && (
            <PdfDownloadButtons data={{
              title,
              school: questionSet.exam_pattern_sets?.school_name,
              grade: questionSet.exam_pattern_sets?.grade,
              area: questionSet.area,
              patternSetTitle: questionSet.exam_pattern_sets?.title,
              passageTitle: questionSet.source_passages?.title,
              passageText: questionSet.source_passages?.passage_text,
              passageImageUrls: questionSet.source_passages?.image_urls,
              keyPoints: questionSet.source_passages?.key_points,
              questions: states.filter(s => !s.excluded).map((s, idx) => ({ ...s.q, question_number: idx + 1 })),
              createdAt: questionSet.created_at,
            } satisfies PdfData} />
          )}
          {saved && <span className="text-xs text-green-600 font-semibold">저장됨 ✓</span>}
          <button
            onClick={saveAll}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-xl font-semibold hover:bg-green-700 disabled:opacity-40 transition"
          >
            {saving ? "저장 중…" : "변경 저장"}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4 pb-24">
        {/* 메타 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">문제 세트 제목</label>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); setSaved(false); }}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
            <span>패턴: <span className="font-semibold text-green-700">{questionSet.exam_pattern_sets?.title ?? "-"}</span></span>
            <span>지문: <span className="font-semibold text-gray-700">{questionSet.source_passages?.title ?? "-"}</span></span>
            {questionSet.area && <span>영역: <span className="font-semibold text-gray-700">{questionSet.area}</span></span>}
          </div>
        </div>

        {/* 지문 */}
        {questionSet.source_passages?.passage_text && (
          <PassageCard
            title={questionSet.source_passages.title}
            text={questionSet.source_passages.passage_text}
          />
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 flex gap-2">
          <span>💡</span>
          <span>「편집」으로 각 문항을 수정하고, 「검수」로 완료 표시하세요. 「×」로 제외된 문항은 저장 시 제외됩니다.</span>
        </div>

        {states.map((s, i) => {
          const q = s.q;
          return (
            <div
              key={i}
              className={`bg-white border rounded-2xl overflow-hidden transition ${
                s.excluded ? "opacity-40 border-gray-200" : s.reviewed ? "border-green-400" : "border-gray-200"
              }`}
            >
              <div className="flex items-start gap-2.5 p-4">
                <button
                  onClick={() => update(i, { excluded: !s.excluded })}
                  title={s.excluded ? "채택" : "제외"}
                  className={`shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition ${
                    s.excluded ? "border-gray-300 bg-gray-100 text-gray-400" : "border-red-200 hover:bg-red-50 text-red-400"
                  }`}
                >
                  {s.excluded ? "+" : "×"}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    <span className="text-sm font-bold text-gray-500">{q.question_number}번</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[q.question_type] ?? "bg-gray-100 text-gray-700"}`}>
                      {q.question_type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLOR[q.difficulty] ?? "bg-gray-100 text-gray-700"}`}>
                      {q.difficulty}
                    </span>
                    {q.answer === 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">서술형</span>}
                    {s.reviewed && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✓ 검수완료</span>}
                    {s.excluded && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">제외됨</span>}
                  </div>
                  <p className="text-sm text-gray-900 leading-snug">{q.question_text}</p>
                </div>

                {!s.excluded && (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => update(i, { reviewed: !s.reviewed })}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition font-medium ${
                        s.reviewed ? "border-green-400 bg-green-50 text-green-700" : "border-gray-300 hover:bg-gray-50 text-gray-500"
                      }`}
                    >
                      {s.reviewed ? "✓ 검수" : "검수"}
                    </button>
                    <button
                      onClick={() => update(i, { editing: !s.editing })}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition font-medium ${
                        s.editing ? "border-green-500 bg-green-50 text-green-700" : "border-gray-300 hover:bg-gray-50 text-gray-600"
                      }`}
                    >
                      {s.editing ? "닫기" : "편집"}
                    </button>
                  </div>
                )}
              </div>

              {/* 읽기 전용 선택지 */}
              {!s.excluded && !s.editing && q.choices.length > 0 && (
                <div className="border-t bg-gray-50/60 px-4 py-3 space-y-1.5">
                  {q.choices.map((c, ci) => (
                    <div key={ci} className={`flex gap-2 text-sm py-1 px-2 rounded-lg ${c.is_correct ? "bg-green-50 text-green-800 font-medium" : "text-gray-600"}`}>
                      <span className="shrink-0">{c.number}.</span>
                      <span className="line-clamp-1">{c.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 편집 패널 */}
              {!s.excluded && s.editing && (
                <div className="border-t bg-gray-50 p-4 space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">문항 유형</label>
                      <select
                        value={q.question_type}
                        onChange={e => update(i, { q: { ...q, question_type: e.target.value } })}
                        className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
                      >
                        {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">난이도</label>
                      <select
                        value={q.difficulty}
                        onChange={e => update(i, { q: { ...q, difficulty: e.target.value } })}
                        className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
                      >
                        {DIFF_OPTIONS.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">발문</label>
                    <textarea
                      value={q.question_text}
                      onChange={e => update(i, { q: { ...q, question_text: e.target.value } })}
                      rows={3}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 resize-y"
                    />
                  </div>

                  {q.choices.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">선택지 (정답 라디오 클릭)</label>
                      <div className="space-y-2">
                        {q.choices.map((c, ci) => (
                          <div key={ci} className={`p-3 rounded-lg border ${c.is_correct ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <input
                                type="radio"
                                name={`answer-edit-${i}`}
                                checked={c.is_correct}
                                onChange={() => updateChoice(i, ci, "is_correct", true)}
                                className="accent-green-600"
                              />
                              <span className="text-xs font-semibold text-gray-600">{c.number}번</span>
                              {c.is_correct && <span className="text-xs text-green-600 font-semibold">정답</span>}
                            </div>
                            <textarea
                              value={c.text}
                              onChange={e => updateChoice(i, ci, "text", e.target.value)}
                              rows={2}
                              placeholder="선택지 내용"
                              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-400 resize-y mb-1.5"
                            />
                            <input
                              value={c.reason}
                              onChange={e => updateChoice(i, ci, "reason", e.target.value)}
                              placeholder={c.is_correct ? "정답 근거" : "오답 이유"}
                              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-400"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.answer === 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">모범 답안</label>
                      <textarea
                        value={q.descriptive_answer}
                        onChange={e => update(i, { q: { ...q, descriptive_answer: e.target.value } })}
                        rows={3}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 resize-y"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">해설</label>
                    <textarea
                      value={q.explanation}
                      onChange={e => update(i, { q: { ...q, explanation: e.target.value } })}
                      rows={4}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 resize-y"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 하단 저장 바 */}
        <div className="sticky bottom-20">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-lg flex items-center justify-between">
            <p className="text-sm text-gray-600">
              채택 <span className="font-bold text-gray-900">{adopted}</span>문항
              {states.filter(s => s.excluded).length > 0 && (
                <span className="text-gray-400"> · 제외 {states.filter(s => s.excluded).length}</span>
              )}
              {" · "}검수 <span className="font-bold text-green-700">{reviewed}</span>
            </p>
            <div className="flex items-center gap-2">
              {saved && <span className="text-sm text-green-600 font-semibold">저장됨 ✓</span>}
              <button
                onClick={saveAll}
                disabled={saving}
                className="px-5 py-2.5 bg-green-600 text-white text-sm rounded-xl font-bold hover:bg-green-700 disabled:opacity-40 transition shadow-sm"
              >
                {saving ? "저장 중…" : "변경 저장"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
