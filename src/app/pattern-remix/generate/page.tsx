"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExamPatternSet } from "@/types/patterns";
import { SourcePassage } from "@/types/passages";
import { PatternBasedQuestion } from "@/types/pattern-remix";
import JobRunner from "@/components/JobRunner";
import PdfDownloadButtons from "@/components/PdfDownloadButtons";
import type { PdfData } from "@/lib/pdf/generate";
import type { Job } from "@/types/jobs";

type WizardStep = 1 | 2 | 3;

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

interface EditableQuestion {
  draft: PatternBasedQuestion;
  excluded: boolean;
  reviewed: boolean;
  editing: boolean;
}

// ── 단계 표시 바 ────────────────────────────────────────────────────────────
function StepBar({
  current,
  pattern,
  passage,
  onStep,
}: {
  current: WizardStep;
  pattern: ExamPatternSet | null;
  passage: SourcePassage | null;
  onStep: (s: WizardStep) => void;
}) {
  const steps: { n: WizardStep; label: string; done: boolean }[] = [
    { n: 1, label: pattern ? pattern.title : "기출 패턴 선택", done: !!pattern },
    { n: 2, label: passage ? passage.title : "지문 선택", done: !!passage },
    { n: 3, label: "문제 생성", done: false },
  ];
  return (
    <div className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => (s.done || s.n < current) ? onStep(s.n) : undefined}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                current === s.n
                  ? "bg-green-600 text-white"
                  : s.done
                    ? "bg-green-50 text-green-700 cursor-pointer hover:bg-green-100"
                    : s.n < current
                      ? "bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200"
                      : "bg-gray-100 text-gray-400 cursor-default"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                current === s.n ? "bg-white/20" : ""
              }`}>
                {s.done && current !== s.n ? "✓" : s.n}
              </span>
              <span className="max-w-[120px] truncate hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <span className="text-gray-200 text-lg flex-shrink-0">›</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 패턴 세트 선택 (1단계) ───────────────────────────────────────────────────
function PatternStep({
  patterns,
  selected,
  loading,
  onSelect,
}: {
  patterns: ExamPatternSet[];
  selected: ExamPatternSet | null;
  loading: boolean;
  onSelect: (p: ExamPatternSet) => void;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">기출 패턴을 선택하세요</h2>
        <p className="text-sm text-gray-500 mt-1">분석해 놓은 기출 시험지의 문항 패턴입니다. 이 패턴을 새 지문에 적용합니다.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      ) : patterns.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-2xl mb-3">📄</p>
          <p className="text-gray-600 font-medium">아직 기출 패턴이 없습니다</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">시험지 사진을 업로드하면 자동으로 패턴을 분석합니다</p>
          <Link
            href="/pattern-remix"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            기출 시험지 분석하러 가기 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {patterns.map(ps => (
            <button
              key={ps.id}
              onClick={() => onSelect(ps)}
              className={`text-left p-4 rounded-2xl border-2 transition-all hover:shadow-md active:scale-[0.98] ${
                selected?.id === ps.id
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-white hover:border-green-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-semibold text-gray-900 leading-snug">{ps.title}</p>
                {selected?.id === ps.id && (
                  <span className="text-green-600 text-lg flex-shrink-0">✓</span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {[ps.school_name, ps.grade, ps.exam_name].filter(Boolean).join(" · ")}
              </p>
              <p className="text-xs font-medium text-green-600 mt-2">
                문항 패턴 {ps.exam_patterns?.length ?? 0}개
              </p>
              {selected?.id !== ps.id && (
                <p className="text-xs text-green-700 font-semibold mt-3">이 패턴 사용하기 →</p>
              )}
            </button>
          ))}
          {/* 추가하기 카드 */}
          <Link
            href="/pattern-remix"
            className="text-left p-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-green-300 hover:bg-green-50 transition-all flex flex-col items-center justify-center gap-2 min-h-[120px]"
          >
            <span className="text-2xl">+</span>
            <span className="text-sm text-gray-500 text-center">기출 시험지 더 분석하기</span>
          </Link>
        </div>
      )}
    </div>
  );
}

// ── 지문 선택 (2단계) ────────────────────────────────────────────────────────
function PassageStep({
  passages,
  selected,
  loading,
  selectedPattern,
  onSelect,
  onBack,
  onRefresh,
}: {
  passages: SourcePassage[];
  selected: SourcePassage | null;
  loading: boolean;
  selectedPattern: ExamPatternSet | null;
  onSelect: (p: SourcePassage) => void;
  onBack: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* 선택된 패턴 요약 */}
      {selectedPattern && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-5">
          <span className="text-green-700 text-sm">✓ 패턴:</span>
          <span className="text-sm font-semibold text-green-800">{selectedPattern.title}</span>
          <button onClick={onBack} className="ml-auto text-xs text-green-600 hover:underline">변경</button>
        </div>
      )}

      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">지문을 선택하세요</h2>
        <p className="text-sm text-gray-500 mt-1">위에서 선택한 기출 패턴을 이 지문에 적용하여 문제를 만듭니다.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      ) : passages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-2xl mb-3">📖</p>
          <p className="text-gray-600 font-medium">아직 등록된 지문이 없습니다</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">사진이나 텍스트로 지문을 등록하세요</p>
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/source-passages"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              지문 등록하러 가기 →
            </Link>
            <button onClick={onRefresh} className="text-xs text-gray-400 hover:text-gray-600 underline">
              등록했는데 안 보이면 여기를 눌러 새로고침
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {passages.map(p => {
            const hasText = !!p.passage_text?.trim();
            return (
              <button
                key={p.id}
                onClick={() => hasText && onSelect(p)}
                disabled={!hasText}
                className={`text-left p-4 rounded-2xl border-2 transition-all ${
                  !hasText
                    ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                    : selected?.id === p.id
                      ? "border-green-500 bg-green-50 hover:shadow-md"
                      : "border-gray-200 bg-white hover:border-green-300 hover:shadow-md active:scale-[0.98]"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-gray-900 leading-snug">{p.title}</p>
                  {selected?.id === p.id && (
                    <span className="text-green-600 text-lg flex-shrink-0">✓</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {[p.area, p.source_type].filter(Boolean).join(" · ")}
                </p>
                {p.analysis_summary && (
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {p.analysis_summary}
                  </p>
                )}
                {!hasText && (
                  <p className="text-xs text-orange-500 mt-2 font-medium">⚠ 지문 텍스트 없음 — 사용 불가</p>
                )}
                {hasText && selected?.id !== p.id && (
                  <p className="text-xs text-green-700 font-semibold mt-3">이 지문 사용하기 →</p>
                )}
              </button>
            );
          })}
          {/* 추가하기 카드 */}
          <Link
            href="/source-passages"
            className="text-left p-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-green-300 hover:bg-green-50 transition-all flex flex-col items-center justify-center gap-2 min-h-[120px]"
          >
            <span className="text-2xl">+</span>
            <span className="text-sm text-gray-500 text-center">지문 더 등록하기</span>
          </Link>
        </div>
      )}
    </div>
  );
}

// ── 지문 미리보기 카드 ────────────────────────────────────────────────────────
function PassagePreviewCard({ title, text }: { title?: string; text: string }) {
  const [open, setOpen] = useState(false);
  const preview = text.slice(0, 120) + (text.length > 120 ? "…" : "");
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-100/50 transition"
      >
        <span className="text-sm font-semibold text-amber-800">
          📖 지문{title ? ` — ${title}` : ""}
        </span>
        <svg className={`w-4 h-4 text-amber-600 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className="px-4 pb-3">
        <p className={`text-sm text-gray-700 leading-relaxed whitespace-pre-wrap ${open ? "" : "line-clamp-3"}`}>
          {open ? text : preview}
        </p>
      </div>
    </div>
  );
}

// ── 문항 카드 ────────────────────────────────────────────────────────────────
function QuestionCard({
  eq, idx, onChange, onToggleExclude, onToggleReviewed, onToggleEdit,
}: {
  eq: EditableQuestion;
  idx: number;
  onChange: (q: PatternBasedQuestion) => void;
  onToggleExclude: () => void;
  onToggleReviewed: () => void;
  onToggleEdit: () => void;
}) {
  const q = eq.draft;

  function updateChoice(ci: number, field: "text" | "reason" | "is_correct", val: string | boolean) {
    const choices = q.choices.map((c, i) => {
      if (field === "is_correct") return { ...c, is_correct: i === ci };
      return i === ci ? { ...c, [field]: val } : c;
    });
    let answer = q.answer;
    if (field === "is_correct") answer = q.choices[ci].number;
    onChange({ ...q, choices, answer });
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      eq.excluded ? "opacity-40 border-gray-200" : eq.reviewed ? "border-green-400" : "border-gray-200"
    }`}>
      <div className="flex items-start gap-2.5 p-4">
        <button
          onClick={onToggleExclude}
          title={eq.excluded ? "다시 포함" : "제외"}
          className={`shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition ${
            eq.excluded
              ? "border-gray-300 bg-gray-100 text-gray-400"
              : "border-red-200 hover:bg-red-50 text-red-400"
          }`}
        >
          {eq.excluded ? "+" : "×"}
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
            {q.answer === 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">서술형</span>
            )}
            {eq.reviewed && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✓ 검수완료</span>
            )}
            {eq.excluded && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">제외됨</span>
            )}
          </div>
          <p className="text-sm text-gray-900 leading-snug">{q.question_text}</p>
        </div>

        <div className="flex gap-1.5 shrink-0">
          {!eq.excluded && (
            <>
              <button
                onClick={onToggleReviewed}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition font-medium ${
                  eq.reviewed
                    ? "border-green-400 bg-green-50 text-green-700"
                    : "border-gray-300 hover:bg-gray-50 text-gray-500"
                }`}
              >
                {eq.reviewed ? "✓ 검수" : "검수"}
              </button>
              <button
                onClick={onToggleEdit}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition font-medium ${
                  eq.editing
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-300 hover:bg-gray-50 text-gray-600"
                }`}
              >
                {eq.editing ? "닫기" : "편집"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 선택지 미리보기 (편집 모드 아닐 때) */}
      {!eq.excluded && !eq.editing && q.choices.length > 0 && (
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
      {!eq.excluded && eq.editing && (
        <div className="border-t bg-gray-50 p-4 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">문항 유형</label>
              <select
                value={q.question_type}
                onChange={e => onChange({ ...q, question_type: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">난이도</label>
              <select
                value={q.difficulty}
                onChange={e => onChange({ ...q, difficulty: e.target.value })}
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
              onChange={e => onChange({ ...q, question_text: e.target.value })}
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
                        name={`answer-${idx}`}
                        checked={c.is_correct}
                        onChange={() => updateChoice(ci, "is_correct", true)}
                        className="accent-green-600"
                      />
                      <span className="text-xs font-semibold text-gray-600">{c.number}번</span>
                      {c.is_correct && <span className="text-xs text-green-600 font-semibold">정답</span>}
                    </div>
                    <textarea
                      value={c.text}
                      onChange={e => updateChoice(ci, "text", e.target.value)}
                      rows={2}
                      placeholder="선택지 내용"
                      className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-400 resize-y mb-1.5"
                    />
                    <input
                      value={c.reason}
                      onChange={e => updateChoice(ci, "reason", e.target.value)}
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
                onChange={e => onChange({ ...q, descriptive_answer: e.target.value })}
                rows={3}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 resize-y"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">해설</label>
            <textarea
              value={q.explanation}
              onChange={e => onChange({ ...q, explanation: e.target.value })}
              rows={4}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 resize-y"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── 문제 생성 (3단계) ────────────────────────────────────────────────────────
function GenerateStep({
  selectedPattern,
  selectedPassage,
  onBack,
}: {
  selectedPattern: ExamPatternSet;
  selectedPassage: SourcePassage;
  onBack: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [generateJobId, setGenerateJobId] = useState<string | null>(null);
  const [generateJobDone, setGenerateJobDone] = useState(false);
  const [sourceJobId, setSourceJobId] = useState<string | null>(null);
  const [editables, setEditables] = useState<EditableQuestion[]>([]);
  const [saveTitle, setSaveTitle] = useState(`${selectedPassage.title} × ${selectedPattern.title}`);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function toEditables(qs: PatternBasedQuestion[]): EditableQuestion[] {
    return qs.map(q => ({ draft: q, excluded: false, reviewed: false, editing: false }));
  }

  function updateEditable(idx: number, patch: Partial<EditableQuestion>) {
    setEditables(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  }

  async function generate() {
    setError("");
    setEditables([]);
    setSavedId(null);
    setGenerateJobId(null);
    setGenerateJobDone(false);
    setSourceJobId(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/pattern-remix/generate-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pattern_set_id: selectedPattern.id,
          source_passage_id: selectedPassage.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "문제 생성 시작 실패");
      setGenerateJobId(data.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 시작 실패");
    } finally {
      setGenerating(false);
    }
  }

  function handleJobComplete(job: Job) {
    const result = job.result as { questions?: PatternBasedQuestion[] } | null;
    if (!result?.questions) return;
    setEditables(toEditables(result.questions));
    setGenerateJobDone(true);
    setSourceJobId(job.id);
  }

  async function save() {
    if (!saveTitle.trim()) { setError("제목을 입력하세요."); return; }
    const finalQuestions = editables
      .filter(e => !e.excluded)
      .map((e, idx) => ({ ...e.draft, question_number: idx + 1 }));
    if (finalQuestions.length === 0) { setError("채택된 문항이 없습니다."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/pattern-based-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: saveTitle.trim(),
          pattern_set_id: selectedPattern.id,
          source_passage_id: selectedPassage.id,
          generated_questions: finalQuestions,
          difficulty: "",
          area: selectedPassage.area ?? "",
          source_job_id: sourceJobId,
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

  const adopted = editables.filter(e => !e.excluded).length;
  const reviewed = editables.filter(e => e.reviewed && !e.excluded).length;
  const isGenerating = generating || (!!generateJobId && !generateJobDone);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-32">
      {/* 선택 요약 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 space-y-2.5">
        <p className="text-sm font-bold text-gray-800 mb-3">선택 완료</p>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-medium flex-shrink-0">기출 패턴</span>
          <p className="text-sm font-medium text-gray-900">{selectedPattern.title}</p>
          <button onClick={onBack} className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex-shrink-0">변경</button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-medium flex-shrink-0">지문</span>
          <p className="text-sm font-medium text-gray-900">{selectedPassage.title}</p>
          <button onClick={onBack} className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex-shrink-0">변경</button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      {/* 초기 상태: 생성 버튼 */}
      {!isGenerating && editables.length === 0 && !savedId && (
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-200">
          <p className="text-3xl mb-3">✨</p>
          <p className="text-gray-700 font-semibold text-base mb-2">
            AI가 문제를 자동으로 만들어 드립니다
          </p>
          <p className="text-sm text-gray-400 mb-6">
            {selectedPattern.exam_patterns?.length ?? 0}개의 기출 패턴을
            &ldquo;{selectedPassage.title}&rdquo;에 적용합니다
          </p>
          <button
            onClick={generate}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-green-600 text-white rounded-xl text-base font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-100"
          >
            문제 생성하기
          </button>
        </div>
      )}

      {/* 생성 중 */}
      {generating && (
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-200">
          <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">문제 생성을 시작하고 있습니다…</p>
        </div>
      )}

      {/* Job 진행 중 */}
      {generateJobId && !generateJobDone && !generating && (
        <div className="bg-white rounded-2xl border border-green-200 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-3 border-green-200 border-t-green-600 rounded-full animate-spin flex-shrink-0" />
            <p className="text-sm font-semibold text-green-700">AI가 문제를 만드는 중입니다…</p>
          </div>
          <p className="text-xs text-gray-400">기출 패턴을 분석하여 새 지문에 맞는 문항을 생성합니다. 1~3분 정도 걸립니다.</p>
          <JobRunner jobId={generateJobId} onComplete={handleJobComplete} />
          <button
            onClick={() => { setGenerateJobId(null); setGenerateJobDone(false); }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            취소
          </button>
        </div>
      )}

      {/* 결과 */}
      {editables.length > 0 && !savedId && (
        <>
          {selectedPassage.passage_text && (
            <PassagePreviewCard title={selectedPassage.title} text={selectedPassage.passage_text} />
          )}

          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-800">
              생성된 문항 {editables.length}개
            </p>
            <p className="text-xs text-gray-400">
              채택 {adopted}개 · 검수완료 {reviewed}개
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 text-xs text-blue-700">
            💡 문항을 검토하고 필요하면 <strong>편집</strong>하세요. 불필요한 문항은 <strong>×</strong>로 제외하세요.
          </div>

          <div className="space-y-3">
            {editables.map((eq, i) => (
              <QuestionCard
                key={i}
                eq={eq}
                idx={i}
                onChange={q => updateEditable(i, { draft: q })}
                onToggleExclude={() => updateEditable(i, { excluded: !eq.excluded })}
                onToggleReviewed={() => updateEditable(i, { reviewed: !eq.reviewed })}
                onToggleEdit={() => updateEditable(i, { editing: !eq.editing })}
              />
            ))}
          </div>

          <div className="mt-6">
            <button
              onClick={generate}
              className="text-sm text-gray-400 hover:text-gray-600 underline"
            >
              마음에 들지 않으면 다시 생성하기
            </button>
          </div>
        </>
      )}

      {/* ── Sticky 저장 + 다운로드 바 ── */}
      {editables.length > 0 && !savedId && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-[60]">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <input
                value={saveTitle}
                onChange={e => { setSaveTitle(e.target.value); setError(""); }}
                placeholder="문제 세트 제목"
                className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white"
              />
            </div>
            <button
              onClick={save}
              disabled={saving || adopted === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${
                !saving && adopted > 0
                  ? "bg-green-600 text-white hover:bg-green-700 shadow-md"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {saving
                ? <><span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" /> 저장 중…</>
                : <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  저장 &amp; 다운로드
                </>}
            </button>
          </div>
          <div className="max-w-3xl mx-auto px-4 pb-2 flex items-center justify-between">
            <p className="text-xs text-gray-400">채택 {adopted}문항 · 제외 {editables.length - adopted}문항</p>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        </div>
      )}

      {/* 저장 완료 + 내보내기 */}
      {savedId && (
        <div className="space-y-4">
          <div className="border-2 border-green-300 bg-green-50 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-green-700 font-bold">저장 완료!</p>
              <p className="text-sm text-green-600 mt-0.5">{saveTitle}</p>
            </div>
          </div>

          {/* 내보내기 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <PdfDownloadButtons
              large
              data={{
                title: saveTitle,
                school: selectedPattern.school_name,
                grade: selectedPattern.grade,
                area: selectedPassage.area,
                patternSetTitle: selectedPattern.title,
                passageTitle: selectedPassage.title,
                passageText: selectedPassage.passage_text,
                passageImageUrls: selectedPassage.image_urls,
                keyPoints: selectedPassage.key_points,
                questions: editables
                  .filter(e => !e.excluded)
                  .map((e, i) => ({ ...e.draft, question_number: i + 1 })),
              } satisfies PdfData}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/pattern-remix/generate/${savedId}/edit`}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              편집하기
            </Link>
            <Link
              href="/pattern-remix/generate/library"
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              문제 목록 보기
            </Link>
            <button
              onClick={() => {
                setEditables([]);
                setSavedId(null);
                setGenerateJobId(null);
                setGenerateJobDone(false);
              }}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              새로 생성하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
function GeneratePageInner() {
  const searchParams = useSearchParams();
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [patternSets, setPatternSets] = useState<ExamPatternSet[]>([]);
  const [passages, setPassages] = useState<SourcePassage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedPattern, setSelectedPattern] = useState<ExamPatternSet | null>(null);
  const [selectedPassage, setSelectedPassage] = useState<SourcePassage | null>(null);

  useEffect(() => {
    const prePattern = searchParams.get("pattern");
    const prePassage = searchParams.get("passage");

    Promise.all([
      fetch("/api/pattern-sets").then(r => r.json()),
      fetch("/api/source-passages").then(r => r.json()),
    ]).then(([ps, sp]) => {
      const loadedPatterns: ExamPatternSet[] = ps.patternSets ?? [];
      const loadedPassages: SourcePassage[] = sp.passages ?? [];
      setPatternSets(loadedPatterns);
      setPassages(loadedPassages);

      let step: WizardStep = 1;
      let autoPattern: ExamPatternSet | null = null;
      let autoPassage: SourcePassage | null = null;

      if (prePattern) {
        const found = loadedPatterns.find(p => p.id === prePattern);
        if (found) { autoPattern = found; step = 2; }
      } else if (loadedPatterns.length === 1) {
        // 패턴이 1개뿐이면 자동 선택
        autoPattern = loadedPatterns[0];
        step = 2;
      }

      if (prePassage) {
        const found = loadedPassages.find(p => p.id === prePassage);
        if (found) { autoPassage = found; if (step === 2) step = 3; }
      } else if (loadedPassages.length === 1 && step === 2) {
        // 지문이 1개뿐이면 자동 선택
        autoPassage = loadedPassages[0];
        step = 3;
      }

      if (autoPattern) setSelectedPattern(autoPattern);
      if (autoPassage) setSelectedPassage(autoPassage);
      setWizardStep(step);
    }).catch(e => {
      setLoadError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다.");
    }).finally(() => {
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refreshPassages() {
    fetch("/api/source-passages").then(r => r.json()).then(sp => {
      setPassages(sp.passages ?? []);
    }).catch(() => {});
  }

  function handleSelectPattern(p: ExamPatternSet) {
    setSelectedPattern(p);
    setWizardStep(2);
  }

  function handleSelectPassage(p: SourcePassage) {
    setSelectedPassage(p);
    setWizardStep(3);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              홈
            </Link>
            <h1 className="text-base font-bold text-gray-900">문제 만들기</h1>
          </div>
          <Link
            href="/pattern-remix/generate/library"
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            저장된 문제 목록
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </header>

      {/* 단계 표시 바 */}
      <StepBar
        current={wizardStep}
        pattern={selectedPattern}
        passage={selectedPassage}
        onStep={(s) => {
          if (s === 1) setWizardStep(1);
          else if (s === 2 && selectedPattern) setWizardStep(2);
          else if (s === 3 && selectedPattern && selectedPassage) setWizardStep(3);
        }}
      />

      {loadError && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{loadError}</div>
        </div>
      )}

      {/* 단계별 콘텐츠 */}
      {wizardStep === 1 && (
        <PatternStep
          patterns={patternSets}
          selected={selectedPattern}
          loading={loading}
          onSelect={handleSelectPattern}
        />
      )}

      {wizardStep === 2 && (
        <PassageStep
          passages={passages}
          selected={selectedPassage}
          loading={loading}
          selectedPattern={selectedPattern}
          onSelect={handleSelectPassage}
          onBack={() => setWizardStep(1)}
          onRefresh={refreshPassages}
        />
      )}

      {wizardStep === 3 && selectedPattern && selectedPassage && (
        <GenerateStep
          selectedPattern={selectedPattern}
          selectedPassage={selectedPassage}
          onBack={() => setWizardStep(2)}
        />
      )}
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    }>
      <GeneratePageInner />
    </Suspense>
  );
}
