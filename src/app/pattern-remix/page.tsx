"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import AuthUserMenu from "@/components/AuthUserMenu";
import { StructuredResult } from "@/types/index";
import { ExamPattern, ExamPatternSetMeta } from "@/types/patterns";

// ── 상수 ─────────────────────────────────────────────────────────────────────
const GRADES = ["고1", "고2", "고3", "중1", "중2", "중3"];
const SEMESTERS = ["1학기", "2학기"];
const EXAM_NAMES = ["1차 지필", "2차 지필", "3차 지필", "수능", "모의고사", "기타"];
const AREAS = ["문학", "독서", "문법", "화작", "기타"];
const CIRCLE = ["①", "②", "③", "④", "⑤"];

type Step = "upload" | "structure" | "extract" | "save" | "done";

function Spinner({ size = 4 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function SectionHeader({ step, current, label, sub }: { step: Step; current: Step; label: string; sub: string }) {
  const steps: Step[] = ["upload", "structure", "extract", "save"];
  const stepIdx = steps.indexOf(step);
  const currentIdx = steps.indexOf(current);
  const done = stepIdx < currentIdx;
  const active = step === current;

  return (
    <div className={`flex-shrink-0 pb-3 mb-3 border-b ${active ? "border-blue-200" : "border-gray-100"}`}>
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          active ? "bg-blue-600 text-white" : done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
        }`}>
          {done ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : stepIdx + 1}
        </div>
        <div>
          <p className={`text-sm font-bold ${active ? "text-blue-700" : done ? "text-green-700" : "text-gray-400"}`}>{label}</p>
          <p className="text-xs text-gray-400">{sub}</p>
        </div>
      </div>
    </div>
  );
}

// ── 패턴 카드 ────────────────────────────────────────────────────────────────
function PatternCard({ pattern }: { pattern: ExamPattern }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {pattern.question_number}
          </span>
          <span className="text-sm font-semibold text-gray-800">{pattern.question_number}번</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{pattern.question_type}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            pattern.difficulty === "기본" ? "bg-green-100 text-green-700" :
            pattern.difficulty === "응용" ? "bg-orange-100 text-orange-700" :
            "bg-red-100 text-red-700"
          }`}>{pattern.difficulty}</span>
          {pattern.uses_reference_box && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">보기</span>
          )}
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 flex flex-col gap-2.5 pt-3">
          <Row label="발문 방식" value={pattern.prompt_style} />
          <Row label="선택지 구성" value={pattern.choice_style} />
          <Row label="정답 근거" value={pattern.answer_basis_type} />
          <Row label="오답 패턴" value={pattern.wrong_choice_pattern} />
          <Row label="출제 의도" value={pattern.intent} />
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-1">
            <p className="text-xs font-semibold text-blue-600 mb-0.5">패턴 요약</p>
            <p className="text-xs text-blue-800 leading-relaxed">{pattern.pattern_summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-0.5">{label}</p>
      <p className="text-xs text-gray-700 leading-relaxed">{value}</p>
    </div>
  );
}

// ── 저장 폼 ─────────────────────────────────────────────────────────────────
const INPUT_CLS = "w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white";
const SELECT_CLS = "w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white";
const LABEL_CLS = "text-xs font-semibold text-gray-700 mb-1 block";

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function PatternRemixPage() {
  // ── OCR 단계 ────────────────────────────────────────────────────────────
  const [images, setImages] = useState<File[]>([]);
  const [ocrText, setOcrText] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);

  // ── 구조화 단계 ─────────────────────────────────────────────────────────
  const [structured, setStructured] = useState<StructuredResult | null>(null);
  const [structureLoading, setStructureLoading] = useState(false);
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(-1);
  const [allGroups, setAllGroups] = useState<StructuredResult[]>([]);

  // ── 패턴 추출 단계 ──────────────────────────────────────────────────────
  const [patterns, setPatterns] = useState<ExamPattern[]>([]);
  const [extractLoading, setExtractLoading] = useState(false);

  // ── 저장 단계 ───────────────────────────────────────────────────────────
  const [meta, setMeta] = useState<ExamPatternSetMeta>({
    title: "", school_name: "", grade: "", semester: "", exam_name: "", area: "", description: "",
  });
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // ── 현재 단계 계산 ──────────────────────────────────────────────────────
  const currentStep: Step =
    savedId ? "done" :
    patterns.length > 0 ? "save" :
    structured ? "extract" :
    ocrText ? "structure" : "upload";

  // ── 이미지 드롭 ─────────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    setImages((prev) => [...prev, ...files].slice(0, 10));
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    setImages((prev) => [...prev, ...files].slice(0, 10));
  };

  // ── OCR ─────────────────────────────────────────────────────────────────
  const handleOcr = async () => {
    if (images.length === 0) return;
    setOcrLoading(true);
    try {
      const formData = new FormData();
      images.forEach((f, i) => formData.append(`image_${i}`, f));
      formData.append("imageCount", String(images.length));
      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).error || "OCR 오류");
      const { text } = await res.json();
      setOcrText(text ?? "");
    } catch (e) {
      alert(e instanceof Error ? e.message : "OCR 실패");
    } finally {
      setOcrLoading(false);
    }
  };

  // ── 구조화 ──────────────────────────────────────────────────────────────
  const handleStructure = async () => {
    if (!ocrText.trim()) return;
    setStructureLoading(true);
    setStructured(null);
    setAllGroups([]);
    setSelectedGroupIdx(-1);
    try {
      const res = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ocrText }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "구조화 오류");
      const { results = [] }: { results: StructuredResult[] } = await res.json();
      setAllGroups(results);
      if (results.length === 1) { setStructured(results[0]); setSelectedGroupIdx(0); }
    } catch (e) {
      alert(e instanceof Error ? e.message : "구조화 실패");
    } finally {
      setStructureLoading(false);
    }
  };

  // ── 패턴 추출 ───────────────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!structured) return;
    setExtractLoading(true);
    setPatterns([]);
    try {
      const res = await fetch("/api/patterns/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structured }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "패턴 추출 오류");
      const { patterns: p } = await res.json();
      setPatterns(p ?? []);
      // meta.area 자동 채우기
      if (structured.area && !meta.area) setMeta((m) => ({ ...m, area: structured.area }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "패턴 추출 실패");
    } finally {
      setExtractLoading(false);
    }
  };

  // ── 저장 ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!meta.title.trim()) { setError("제목을 입력하세요."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/pattern-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meta, patterns }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setSavedId(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  // ── 초기화 ──────────────────────────────────────────────────────────────
  const handleReset = () => {
    setImages([]); setOcrText(""); setStructured(null); setAllGroups([]);
    setSelectedGroupIdx(-1); setPatterns([]);
    setMeta({ title: "", school_name: "", grade: "", semester: "", exam_name: "", area: "", description: "" });
    setSavedId(null); setError("");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">기출 패턴 추출</h1>
            <p className="text-xs text-gray-500 -mt-0.5">기출시험지 → OCR → 구조화 → 패턴 추출 → 저장</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/pattern-remix/library"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              패턴 라이브러리
            </Link>
            <Link href="/source-passages"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 transition-colors">
              지문 등록
            </Link>
            <Link href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              문제은행
            </Link>
            <AuthUserMenu />
          </div>
        </div>
      </header>

      {/* 완료 배너 */}
      {savedId && (
        <div className="bg-green-50 border-b border-green-200 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              패턴 세트가 저장되었습니다.
            </div>
            <div className="flex gap-2">
              <Link href="/pattern-remix/library"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 transition-colors">
                라이브러리에서 보기
              </Link>
              <button onClick={handleReset}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                새 기출 추출하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메인 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 flex gap-6 min-h-0">

        {/* ── 왼쪽: 업로드 + OCR ─────────────────────────────────────────── */}
        <div className="w-[42%] flex-shrink-0 flex flex-col gap-4">

          {/* 업로드 박스 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
            <SectionHeader step="upload" current={currentStep} label="기출시험지 업로드" sub="이미지 업로드 후 OCR 실행" />

            {/* 드롭존 */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center gap-2 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer"
              onClick={() => document.getElementById("pattern-file-input")?.click()}
            >
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-xs text-gray-500">시험지 이미지를 드래그하거나 클릭하세요<br />(최대 10장)</p>
              <input id="pattern-file-input" type="file" multiple accept="image/*" className="hidden" onChange={handleFileInput} />
            </div>

            {/* 업로드된 이미지 목록 */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {images.map((f, i) => (
                  <div key={i} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(f)} alt={f.name}
                      className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                    <button
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleOcr} disabled={images.length === 0 || ocrLoading}
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                images.length > 0 && !ocrLoading ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}>
              {ocrLoading ? <><Spinner /> OCR 실행 중...</> : "OCR 실행"}
            </button>
          </div>

          {/* OCR 텍스트 에디터 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 flex-1 min-h-0">
            <SectionHeader step="structure" current={currentStep} label="OCR 결과 확인·수정" sub="텍스트 수정 후 구조화" />
            <textarea
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              placeholder={ocrLoading ? "OCR 실행 중..." : "OCR 결과가 여기에 표시됩니다."}
              disabled={ocrLoading}
              className="flex-1 w-full resize-none border border-gray-200 rounded-xl p-3 text-sm text-gray-800 placeholder:text-gray-400 font-mono leading-relaxed focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 min-h-[200px]"
            />
            <button onClick={handleStructure}
              disabled={!ocrText.trim() || structureLoading}
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                ocrText.trim() && !structureLoading ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}>
              {structureLoading ? <><Spinner /> 구조화 중...</> : "문항 구조화"}
            </button>
          </div>
        </div>

        {/* ── 오른쪽: 구조화 결과 + 패턴 추출 + 저장 ─────────────────────── */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">

          {/* 그룹 선택 (복수 지문일 때) */}
          {!structureLoading && allGroups.length > 1 && selectedGroupIdx === -1 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-800 mb-1">여러 지문 그룹이 감지되었습니다.</p>
              <p className="text-xs text-gray-500 mb-3">패턴을 추출할 지문 그룹을 선택하세요.</p>
              <div className="grid grid-cols-2 gap-3">
                {allGroups.map((g, i) => (
                  <button key={i} onClick={() => { setSelectedGroupIdx(i); setStructured(g); }}
                    className="text-left p-4 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all">
                    <p className="text-sm font-semibold text-gray-800">{g.passageGroupLabel || `그룹 ${i + 1}`}</p>
                    <p className="text-xs text-gray-500 mt-1">{g.area} · {g.questions.length}문항</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 구조화 결과 미리보기 */}
          {structured && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">구조화 결과</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{structured.area}</span>
                  <span className="text-xs text-gray-500">{structured.questions.length}문항</span>
                </div>
                {allGroups.length > 1 && (
                  <button onClick={() => { setSelectedGroupIdx(-1); setStructured(null); setPatterns([]); }}
                    className="text-xs text-gray-500 hover:text-gray-700">다시 선택</button>
                )}
              </div>

              {/* 문항 목록 */}
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {structured.questions.map((q) => (
                  <div key={q.id} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-gray-700 mb-1">{q.questionNumber}번. {q.questionText.slice(0, 60)}{q.questionText.length > 60 ? "..." : ""}</p>
                    <div className="flex flex-wrap gap-1">
                      {q.choices.slice(0, 3).map((c) => (
                        <span key={c.number} className="text-xs text-gray-500">{CIRCLE[c.number - 1]} {c.text.slice(0, 15)}...</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={handleExtract} disabled={extractLoading}
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  !extractLoading ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}>
                {extractLoading ? <><Spinner /> 패턴 추출 중... (30~60초)</> : "패턴 추출 시작"}
              </button>
            </div>
          )}

          {/* 로딩 */}
          {extractLoading && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 flex flex-col items-center gap-3">
              <svg className="w-10 h-10 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-500 font-medium">AI가 출제 패턴을 분석 중입니다...</p>
              <p className="text-xs text-gray-400">발문 방식, 선택지 구성, 정답 근거 방식 등 분석</p>
            </div>
          )}

          {/* 패턴 결과 */}
          {patterns.length > 0 && !extractLoading && (
            <>
              <div className="flex items-center justify-between flex-shrink-0">
                <p className="text-sm font-semibold text-gray-800">추출된 패턴 ({patterns.length}문항)</p>
              </div>
              {patterns.map((p) => <PatternCard key={p.question_number} pattern={p} />)}
            </>
          )}

          {/* 저장 폼 */}
          {patterns.length > 0 && !savedId && (
            <div className="bg-white rounded-2xl border border-purple-200 shadow-sm p-5 flex flex-col gap-4">
              <SectionHeader step="save" current={currentStep} label="패턴 세트 저장" sub="학교/시험 정보를 입력하고 저장" />

              <div>
                <label className={LABEL_CLS}>제목 <span className="text-purple-500">*</span></label>
                <input value={meta.title} onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
                  placeholder="예: 2024 수완고 1학년 1차 지필 문학"
                  className={INPUT_CLS + (error ? " border-red-400" : "")} />
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLS}>학교명</label>
                  <input value={meta.school_name} onChange={(e) => setMeta((m) => ({ ...m, school_name: e.target.value }))}
                    placeholder="예: 수완고등학교" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>학년</label>
                  <select value={meta.grade} onChange={(e) => setMeta((m) => ({ ...m, grade: e.target.value }))} className={SELECT_CLS}>
                    <option value="">선택</option>
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>학기</label>
                  <select value={meta.semester} onChange={(e) => setMeta((m) => ({ ...m, semester: e.target.value }))} className={SELECT_CLS}>
                    <option value="">선택</option>
                    {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>시험명</label>
                  <select value={meta.exam_name} onChange={(e) => setMeta((m) => ({ ...m, exam_name: e.target.value }))} className={SELECT_CLS}>
                    <option value="">선택</option>
                    {EXAM_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>영역</label>
                  <select value={meta.area} onChange={(e) => setMeta((m) => ({ ...m, area: e.target.value }))} className={SELECT_CLS}>
                    <option value="">선택</option>
                    {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={LABEL_CLS}>메모</label>
                <textarea value={meta.description} onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
                  rows={2} placeholder="이 기출 패턴에 대한 메모 (선택)"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none bg-white" />
              </div>

              <button onClick={handleSave} disabled={saving}
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  !saving ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}>
                {saving ? <><Spinner /> 저장 중...</> : "패턴 세트 저장"}
              </button>
            </div>
          )}

          {/* 빈 상태 안내 */}
          {!structured && !structureLoading && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 flex flex-col items-center justify-center gap-3 flex-1">
              <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 text-center">왼쪽에서 기출시험지를 업로드하고<br />OCR → 구조화 → 패턴 추출 순으로 진행하세요.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
