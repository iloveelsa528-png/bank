"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExamPatternSet } from "@/types/patterns";
import { SourcePassage } from "@/types/passages";
import { PatternBasedQuestion } from "@/types/pattern-remix";
import JobRunner from "@/components/JobRunner";
import type { Job } from "@/types/jobs";

function PassageCard({ title, text }: { title?: string; text: string }) {
  const [open, setOpen] = useState(false);
  const preview = text.slice(0, 100) + (text.length > 100 ? "…" : "");
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-amber-100/50 transition"
      >
        <span className="text-xs font-semibold text-amber-800">
          지문{title ? ` — ${title}` : ""}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-amber-600 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {!open && (
        <p className="px-3 pb-2.5 text-xs text-amber-700 leading-relaxed">{preview}</p>
      )}
      {open && (
        <div className="px-3 pb-3">
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

interface EditableQuestion {
  draft: PatternBasedQuestion;
  excluded: boolean;
  reviewed: boolean;
  editing: boolean;
}

function QuestionCard({
  eq,
  idx,
  onChange,
  onToggleExclude,
  onToggleReviewed,
  onToggleEdit,
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
      if (field === "is_correct") {
        return { ...c, is_correct: i === ci };
      }
      return i === ci ? { ...c, [field]: val } : c;
    });
    let answer = q.answer;
    if (field === "is_correct") answer = q.choices[ci].number;
    onChange({ ...q, choices, answer });
  }

  return (
    <div className={`border rounded-lg overflow-hidden transition ${eq.excluded ? "opacity-40 border-gray-200" : eq.reviewed ? "border-green-400" : "border-gray-200"}`}>
      {/* 카드 헤더 */}
      <div className="flex items-start gap-2 p-3">
        {/* 제외 토글 */}
        <button
          onClick={onToggleExclude}
          title={eq.excluded ? "채택" : "제외"}
          className={`shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold transition ${
            eq.excluded ? "border-gray-300 bg-gray-100 text-gray-400" : "border-red-300 hover:bg-red-50 text-red-400"
          }`}
        >
          {eq.excluded ? "+" : "×"}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="font-mono text-sm text-gray-500">{q.question_number}.</span>
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
          <p className="text-sm text-gray-900 leading-snug line-clamp-2">{q.question_text}</p>
          {q.pattern_reference && (
            <p className="text-xs text-purple-500 mt-0.5">패턴 참조: {q.pattern_reference}</p>
          )}
        </div>

        <div className="flex gap-1.5 shrink-0">
          {!eq.excluded && (
            <>
              <button
                onClick={onToggleReviewed}
                className={`text-xs px-2 py-1 rounded border transition ${
                  eq.reviewed
                    ? "border-green-400 bg-green-50 text-green-700"
                    : "border-gray-300 hover:bg-gray-50 text-gray-500"
                }`}
              >
                {eq.reviewed ? "검수완료" : "검수"}
              </button>
              <button
                onClick={onToggleEdit}
                className={`text-xs px-2 py-1 rounded border transition ${
                  eq.editing
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-300 hover:bg-gray-50 text-gray-600"
                }`}
              >
                {eq.editing ? "접기" : "편집"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 편집/상세 패널 */}
      {!eq.excluded && eq.editing && (
        <div className="border-t bg-gray-50 p-4 space-y-4">
          {/* 유형·난이도 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">문항 유형</label>
              <select
                value={q.question_type}
                onChange={e => onChange({ ...q, question_type: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">난이도</label>
              <select
                value={q.difficulty}
                onChange={e => onChange({ ...q, difficulty: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {DIFF_OPTIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* 발문 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">발문</label>
            <textarea
              value={q.question_text}
              onChange={e => onChange({ ...q, question_text: e.target.value })}
              rows={3}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
            />
          </div>

          {/* 선택지 */}
          {q.choices.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">선택지 (정답 라디오 클릭)</label>
              <div className="space-y-2">
                {q.choices.map((c, ci) => (
                  <div key={ci} className={`p-2 rounded border ${c.is_correct ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name={`answer-${idx}`}
                        checked={c.is_correct}
                        onChange={() => updateChoice(ci, "is_correct", true)}
                        className="accent-green-600"
                      />
                      <span className="text-xs font-medium text-gray-600">{c.number}번</span>
                      {c.is_correct && <span className="text-xs text-green-600 font-medium">정답</span>}
                    </div>
                    <textarea
                      value={c.text}
                      onChange={e => updateChoice(ci, "text", e.target.value)}
                      rows={2}
                      placeholder="선택지 내용"
                      className="w-full text-sm border border-gray-200 rounded px-2 py-1 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-400 resize-y mb-1"
                    />
                    <input
                      value={c.reason}
                      onChange={e => updateChoice(ci, "reason", e.target.value)}
                      placeholder={c.is_correct ? "정답 근거 (지문 근거 명시)" : "오답 이유"}
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 서술형 모범 답안 */}
          {q.answer === 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">모범 답안</label>
              <textarea
                value={q.descriptive_answer}
                onChange={e => onChange({ ...q, descriptive_answer: e.target.value })}
                rows={3}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
              />
            </div>
          )}

          {/* 해설 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">해설</label>
            <textarea
              value={q.explanation}
              onChange={e => onChange({ ...q, explanation: e.target.value })}
              rows={4}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
            />
          </div>

          {/* 패턴 참조 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">패턴 참조</label>
            <input
              value={q.pattern_reference}
              onChange={e => onChange({ ...q, pattern_reference: e.target.value })}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        </div>
      )}

      {/* 읽기 전용 펼침 (편집 모드가 아닐 때) */}
      {!eq.excluded && !eq.editing && q.choices.length > 0 && (
        <div className="border-t bg-gray-50/60 p-3 space-y-1.5">
          {q.choices.map((c, ci) => (
            <div key={ci} className={`flex gap-2 text-sm p-1.5 rounded ${c.is_correct ? "bg-green-50 text-green-800" : "text-gray-700"}`}>
              <span className="font-medium shrink-0">{c.number}.</span>
              <span className="line-clamp-1">{c.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GeneratePageInner() {
  const searchParams = useSearchParams();
  const [patternSets, setPatternSets] = useState<ExamPatternSet[]>([]);
  const [passages, setPassages] = useState<SourcePassage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedPattern, setSelectedPattern] = useState<ExamPatternSet | null>(null);
  const [selectedPassage, setSelectedPassage] = useState<SourcePassage | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateJobId, setGenerateJobId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('generateJobId');
  });
  const [generateJobDone, setGenerateJobDone] = useState(false);
  const [sourceJobId, setSourceJobId] = useState<string | null>(null);
  const [editables, setEditables] = useState<EditableQuestion[]>([]);
  const [saveTitle, setSaveTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const prePattern = searchParams.get("pattern");
    const prePassage = searchParams.get("passage");

    Promise.all([
      fetch("/api/pattern-sets").then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "패턴 세트 로드 실패");
        return data;
      }),
      fetch("/api/source-passages").then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "지문 로드 실패");
        return data;
      }),
    ]).then(([ps, sp]) => {
      const loadedPatterns: ExamPatternSet[] = ps.patternSets ?? [];
      const loadedPassages: SourcePassage[] = sp.passages ?? [];
      setPatternSets(loadedPatterns);
      setPassages(loadedPassages);
      // URL 파라미터로 사전 선택
      if (prePattern) {
        const found = loadedPatterns.find(p => p.id === prePattern);
        if (found) setSelectedPattern(found);
      }
      if (prePassage) {
        const found = loadedPassages.find(p => p.id === prePassage);
        if (found) setSelectedPassage(found);
      }
    }).catch(e => {
      setLoadError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다. 새로고침해 주세요.");
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  function toEditables(qs: PatternBasedQuestion[]): EditableQuestion[] {
    return qs.map(q => ({ draft: q, excluded: false, reviewed: false, editing: false }));
  }

  function updateEditable(idx: number, patch: Partial<EditableQuestion>) {
    setEditables(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  }

  async function generate() {
    if (!selectedPattern || !selectedPassage) {
      setError("패턴 세트와 지문을 모두 선택하세요.");
      return;
    }
    setError("");
    setEditables([]);
    setSavedId(null);
    setGenerateJobId(null);
    setGenerateJobDone(false);
    setSourceJobId(null);
    setSaveTitle(`${selectedPassage.title} × ${selectedPattern.title}`);
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
      if (!res.ok) throw new Error(data.error ?? "문제 생성 job 시작 실패");
      setGenerateJobId(data.jobId);
      localStorage.setItem("generateJobId", data.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 시작 실패");
    } finally {
      setGenerating(false);
    }
  }

  function handleGenerateJobComplete(job: Job) {
    const result = job.result as { questions?: PatternBasedQuestion[] } | null;
    if (!result?.questions) return;
    setEditables(toEditables(result.questions));
    setGenerateJobDone(true);
    setSourceJobId(job.id);
    localStorage.removeItem("generateJobId");
  }

  async function save() {
    if (!saveTitle.trim()) { setError("제목을 입력하세요."); return; }
    if (!selectedPattern || !selectedPassage) return;
    const finalQuestions = editables
      .filter(e => !e.excluded)
      .map((e, idx) => ({ ...e.draft, question_number: idx + 1 }));
    if (finalQuestions.length === 0) { setError("채택된 문항이 없습니다."); return; }
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
  const selectedPassageHasText = !!selectedPassage?.passage_text?.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/pattern-remix" className="text-purple-600 hover:text-purple-800 text-sm">← 패턴 추출</Link>
          <h1 className="text-xl font-bold text-gray-900">패턴 기반 문제 생성</h1>
        </div>
        <Link href="/pattern-remix/generate/library" className="text-sm bg-purple-100 text-purple-700 px-3 py-1.5 rounded hover:bg-purple-200">
          저장된 문제 보기
        </Link>
      </header>

      {loadError && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{loadError}</div>
      )}

      <div className="flex h-[calc(100vh-64px)]">
        {/* Col 1: 패턴 세트 선택 */}
        <div className="w-[26%] border-r bg-white flex flex-col">
          <div className="p-4 border-b bg-purple-50">
            <h2 className="font-semibold text-purple-800 text-sm">① 기출 패턴 세트 선택</h2>
            <p className="text-xs text-gray-500 mt-0.5">{loading ? "불러오는 중…" : `${patternSets.length}개 저장됨`}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="flex justify-center pt-12"><div className="w-5 h-5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" /></div>
            ) : patternSets.length === 0 ? (
              <div className="text-center text-gray-400 text-sm pt-12">
                <p>저장된 패턴 세트 없음</p>
                <Link href="/pattern-remix" className="text-purple-600 hover:underline text-xs mt-2 block">패턴 추출하러 가기</Link>
              </div>
            ) : patternSets.map(ps => (
              <button
                key={ps.id}
                onClick={() => setSelectedPattern(ps)}
                className={`w-full text-left p-3 rounded-lg border text-sm transition ${
                  selectedPattern?.id === ps.id ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/50"
                }`}
              >
                <p className="font-medium text-gray-900 leading-tight">{ps.title}</p>
                <p className="text-xs text-gray-500 mt-1">{ps.school_name} · {ps.grade} · {ps.exam_name}</p>
                <p className="text-xs text-purple-600 mt-1">패턴 {ps.exam_patterns?.length ?? 0}개</p>
              </button>
            ))}
          </div>
        </div>

        {/* Col 2: 지문 선택 */}
        <div className="w-[26%] border-r bg-white flex flex-col">
          <div className="p-4 border-b bg-teal-50">
            <h2 className="font-semibold text-teal-800 text-sm">② 새 지문 선택</h2>
            <p className="text-xs text-gray-500 mt-0.5">{loading ? "불러오는 중…" : `${passages.length}개 저장됨`}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="flex justify-center pt-12"><div className="w-5 h-5 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" /></div>
            ) : passages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm pt-12">
                <p>저장된 지문 없음</p>
                <Link href="/source-passages" className="text-teal-600 hover:underline text-xs mt-2 block">지문 등록하러 가기</Link>
              </div>
            ) : passages.map(p => {
              const hasText = !!p.passage_text?.trim();
              return (
              <button
                key={p.id}
                onClick={() => setSelectedPassage(p)}
                className={`w-full text-left p-3 rounded-lg border text-sm transition ${
                  selectedPassage?.id === p.id ? "border-teal-500 bg-teal-50" : "border-gray-200 hover:border-teal-300 hover:bg-teal-50/50"
                }`}
              >
                <p className="font-medium text-gray-900 leading-tight">{p.title}</p>
                <p className="text-xs text-gray-500 mt-1">{p.area} · {p.source_type}</p>
                {!hasText && (
                  <p className="text-xs text-orange-500 mt-1">⚠ 지문 텍스트 없음 — 문제 생성 불가</p>
                )}
                {hasText && (
                  <p className="text-xs text-teal-600 mt-1 line-clamp-2">
                    {p.analysis_summary?.slice(0, 80)}{(p.analysis_summary?.length ?? 0) > 80 ? "…" : ""}
                  </p>
                )}
              </button>
            )})}
          </div>
        </div>

        {/* Col 3: 생성 + 검수 + 저장 */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">③ 문제 생성 · 검수 · 저장</h2>
              {editables.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  채택 {adopted}/{editables.length}문항 · 검수완료 {reviewed}문항
                </p>
              )}
            </div>
            <button
              onClick={generate}
              disabled={generating || (!!generateJobId && !generateJobDone) || !selectedPattern || !selectedPassage || !selectedPassageHasText}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg font-medium hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {generating ? "시작 중…" : editables.length > 0 || generateJobDone ? "재생성" : "문제 생성"}
            </button>
          </div>

          {/* 선택 요약 */}
          <div className="px-4 py-2 border-b bg-gray-50/50 flex gap-4 text-xs text-gray-600 flex-wrap">
            <span>패턴: <span className="font-medium text-purple-700">{selectedPattern?.title ?? "미선택"}</span></span>
            <span>지문: <span className="font-medium text-teal-700">{selectedPassage?.title ?? "미선택"}</span></span>
            {selectedPassage && !selectedPassageHasText && (
              <span className="text-orange-600 font-medium">⚠ 선택한 지문에 텍스트가 없습니다. 지문 편집에서 텍스트를 입력해주세요.</span>
            )}
          </div>

          {error && (
            <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            {generating && (
              <div className="flex flex-col items-center justify-center h-32 gap-3">
                <div className="w-6 h-6 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">문제 생성 job 시작 중…</p>
              </div>
            )}

            {generateJobId && !generateJobDone && !generating && (
              <div className="py-6 space-y-3">
                <p className="text-sm font-medium text-purple-700 text-center">문제 생성 중 (Job)…</p>
                <JobRunner jobId={generateJobId} onComplete={handleGenerateJobComplete} />
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setGenerateJobId(null);
                      setGenerateJobDone(false);
                      localStorage.removeItem("generateJobId");
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {!generating && editables.length === 0 && !savedId && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm gap-2">
                <p>패턴 세트와 지문을 선택하고</p>
                <p>「문제 생성」을 클릭하세요</p>
              </div>
            )}

            {editables.length > 0 && selectedPassage?.passage_text && (
              <PassageCard title={selectedPassage.title} text={selectedPassage.passage_text} />
            )}

            {editables.length > 0 && (
              <>
                {/* 검수 안내 */}
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start gap-2">
                  <span>💡</span>
                  <span>「편집」으로 발문·선택지·해설을 수정하고, 「검수」로 완료 표시하세요. 「×」로 불필요한 문항을 제외할 수 있습니다.</span>
                </div>

                <div className="space-y-3 mb-6">
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
              </>
            )}

            {/* 저장 완료 후 공간 확보 */}
            {editables.length > 0 && !savedId && <div className="h-20" />}

            {savedId && (
              <div className="border border-green-300 bg-green-50 rounded-lg p-4 text-center">
                <p className="text-green-700 font-semibold">저장 완료!</p>
                <div className="flex gap-2 justify-center mt-3 flex-wrap">
                  <Link
                    href={`/pattern-remix/generate/${savedId}/edit`}
                    className="text-sm text-purple-600 border border-purple-300 px-3 py-1.5 rounded hover:bg-purple-50"
                  >
                    계속 편집
                  </Link>
                  <Link
                    href="/pattern-remix/generate/library"
                    className="text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50"
                  >
                    저장된 문제 목록
                  </Link>
                  <button
                    onClick={() => { setEditables([]); setSavedId(null); setSelectedPattern(null); setSelectedPassage(null); setGenerateJobId(null); setGenerateJobDone(false); localStorage.removeItem("generateJobId"); }}
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

      {/* Sticky 저장 바 — 문제 생성 후 항상 하단에 표시 */}
      {editables.length > 0 && !savedId && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 px-6 py-3">
          <div className="flex items-center gap-3 max-w-7xl mx-auto">
            <div className="flex-shrink-0 text-xs text-gray-500">
              채택 <span className="font-semibold text-purple-700">{adopted}</span>/{editables.length}문항
              {editables.filter(e => e.excluded).length > 0 && (
                <span className="text-gray-400"> · 제외 {editables.filter(e => e.excluded).length}개</span>
              )}
            </div>
            <input
              value={saveTitle}
              onChange={e => setSaveTitle(e.target.value)}
              placeholder="문제 세트 제목 입력 후 저장"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            {error && <p className="text-xs text-red-500 flex-shrink-0">{error}</p>}
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-40 transition font-bold flex-shrink-0 shadow-md"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><svg className="w-8 h-8 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>}>
      <GeneratePageInner />
    </Suspense>
  );
}
