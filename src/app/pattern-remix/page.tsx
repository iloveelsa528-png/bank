"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import AuthUserMenu from "@/components/AuthUserMenu";
import { ExamPattern, ExamPatternSetMeta } from "@/types/patterns";

const GRADES    = ["고1", "고2", "고3", "중1", "중2", "중3"];
const SEMESTERS = ["1학기", "2학기"];
const EXAM_NAMES = ["1차 지필", "2차 지필", "3차 지필", "수능", "모의고사", "기타"];
const AREAS     = ["문학", "독서", "문법", "화작", "기타"];

interface ParsedQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  boxText?: string;
  choices: { number: number; text: string }[];
}

interface AnalyzedGroup {
  passageGroupLabel?: string;
  area: string;
  passageTitle?: string;
  passageAuthor?: string;
  passageContent?: string;
  sharedBoxContent?: string;
  questions: ParsedQuestion[];
  patterns: ExamPattern[];
}

function Spinner({ size = 4 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function FileCard({
  file, index, ocrDone, ocrPreview, onRemove,
}: {
  file: File; index: number; ocrDone: boolean; ocrPreview?: string; onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={URL.createObjectURL(file)}
        alt={file.name}
        className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0"
      />
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-xs font-semibold text-gray-800 truncate" title={file.name}>{file.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{fmtSize(file.size)} · 페이지 {index + 1}</p>
        {ocrDone && ocrPreview && index === 0 && (
          <p className="text-xs text-gray-500 mt-1.5 italic line-clamp-2 leading-relaxed">"{ocrPreview}"</p>
        )}
        {ocrDone && index > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            OCR 완료
          </span>
        )}
      </div>
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 w-5 h-5 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-xs hover:bg-red-200 transition-colors"
      >×</button>
    </div>
  );
}

function PatternCard({ pattern }: { pattern: ExamPattern }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2 flex-wrap">
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
        <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
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
          <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 mt-1">
            <p className="text-xs font-semibold text-green-600 mb-0.5">패턴 요약</p>
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

const INPUT_CLS  = "w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white";
const SELECT_CLS = "w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white";
const LABEL_CLS  = "text-xs font-semibold text-gray-700 mb-1 block";

export default function PatternRemixPage() {
  const [images, setImages]         = useState<File[]>([]);
  const [ocrText, setOcrText]       = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDone, setOcrDone]       = useState(false);

  const [groups, setGroups]               = useState<AnalyzedGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<AnalyzedGroup | null>(null);
  const [analyzing, setAnalyzing]         = useState(false);

  const [meta, setMeta] = useState<ExamPatternSetMeta>({
    title: "", school_name: "", grade: "", semester: "", exam_name: "", area: "", description: "",
  });
  const [saving, setSaving]   = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError]     = useState("");

  const patterns = selectedGroup?.patterns ?? [];

  // OCR 미리보기: 첫 두 줄
  const ocrPreview = ocrText
    ? ocrText.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 2).join(" ").slice(0, 100)
    : undefined;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    setImages(prev => [...prev, ...files].slice(0, 10));
    setOcrDone(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith("image/"));
    setImages(prev => [...prev, ...files].slice(0, 10));
    setOcrDone(false);
  };

  const handleOcr = async () => {
    if (images.length === 0) return;
    setOcrLoading(true);
    setOcrDone(false);
    try {
      const formData = new FormData();
      images.forEach((f, i) => formData.append(`image_${i}`, f));
      formData.append("imageCount", String(images.length));
      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).error || "OCR 오류");
      const { text } = await res.json();
      setOcrText(text ?? "");
      setOcrDone(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "OCR 실패");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!ocrText.trim()) return;
    setAnalyzing(true);
    setGroups([]);
    setSelectedGroup(null);
    try {
      const res = await fetch("/api/patterns/analyze-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ocrText }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "분석 오류");
      const { groups: g }: { groups: AnalyzedGroup[] } = await res.json();
      setGroups(g);
      if (g.length === 1) {
        setSelectedGroup(g[0]);
        if (g[0].area && !meta.area) setMeta(m => ({ ...m, area: g[0].area }));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "분석 실패");
    } finally {
      setAnalyzing(false);
    }
  };

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

  const handleReset = () => {
    setImages([]); setOcrText(""); setOcrDone(false); setGroups([]); setSelectedGroup(null);
    setMeta({ title: "", school_name: "", grade: "", semester: "", exam_name: "", area: "", description: "" });
    setSavedId(null); setError("");
  };

  const readyToAnalyze = !!ocrText.trim() && !analyzing;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            홈
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">기출문제 등록 · 패턴 분석</h1>
            <p className="text-xs text-gray-500 -mt-0.5">시험지 업로드 → OCR → 구조화+패턴 추출 (한 번에)</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/pattern-remix/library"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              패턴 라이브러리
            </Link>
            <Link href="/source-passages"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 transition-colors">
              지문 등록
            </Link>
            <Link href="/pattern-remix/generate"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors">
              문제 생성 →
            </Link>
            <AuthUserMenu />
          </div>
        </div>
      </header>

      {/* 완료 배너 */}
      {savedId && (
        <div className="bg-green-50 border-b border-green-200 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between flex-wrap gap-2">
            <span className="text-green-700 text-sm font-medium">패턴 세트가 저장되었습니다.</span>
            <div className="flex gap-2 flex-wrap">
              <Link href="/source-passages"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-teal-700 bg-teal-100 hover:bg-teal-200 transition-colors">
                다음: 지문 등록 →
              </Link>
              <Link href="/pattern-remix/generate"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors">
                바로 문제 생성 →
              </Link>
              <Link href="/pattern-remix/library"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 transition-colors">
                라이브러리 보기
              </Link>
              <button onClick={handleReset}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                새 기출 추출
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 flex gap-6 min-h-0">

        {/* ── 왼쪽 ───────────────────────────────────────────────────────── */}
        <div className="w-[40%] flex-shrink-0 flex flex-col gap-4">

          {/* STEP 1: 업로드 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                ocrDone ? "bg-green-500 text-white" : images.length > 0 ? "bg-green-600 text-white" : "bg-gray-200 text-gray-400"
              }`}>
                {ocrDone ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : 1}
              </div>
              <p className={`text-sm font-bold ${ocrDone ? "text-green-700" : "text-blue-700"}`}>
                기출시험지 업로드 {ocrDone && <span className="font-normal text-green-600">· OCR 완료</span>}
              </p>
            </div>

            {/* 드롭존 */}
            {images.length === 0 && (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-2 text-center hover:border-green-300 hover:bg-green-50/30 transition-colors cursor-pointer"
                onClick={() => document.getElementById("pattern-file-input")?.click()}
              >
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-xs text-gray-500">시험지 이미지를 드래그하거나 클릭<br />(최대 10장)</p>
              </div>
            )}

            {/* 파일 카드 목록 */}
            {images.length > 0 && (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="flex flex-col gap-2"
              >
                {images.map((f, i) => (
                  <FileCard
                    key={i}
                    file={f}
                    index={i}
                    ocrDone={ocrDone}
                    ocrPreview={ocrPreview}
                    onRemove={() => { setImages(p => p.filter((_, j) => j !== i)); setOcrDone(false); setOcrText(""); }}
                  />
                ))}
                {/* 추가 버튼 */}
                <button
                  onClick={() => document.getElementById("pattern-file-input")?.click()}
                  className="flex items-center justify-center gap-1 py-2 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 hover:border-green-300 hover:text-green-500 transition-colors"
                >
                  + 이미지 추가
                </button>
              </div>
            )}

            <input id="pattern-file-input" type="file" multiple accept="image/*" className="hidden" onChange={handleFileInput} />

            {/* OCR 버튼 */}
            <button
              onClick={handleOcr}
              disabled={images.length === 0 || ocrLoading}
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                images.length > 0 && !ocrLoading
                  ? ocrDone
                    ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200"
                    : "bg-green-600 text-white hover:bg-green-700 shadow-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {ocrLoading ? <><Spinner /> OCR 실행 중…</> : ocrDone ? "OCR 재실행" : "OCR 실행"}
            </button>
          </div>

          {/* STEP 2: OCR 텍스트 + 분석 버튼 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 flex-1 min-h-0">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                readyToAnalyze ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-400"
              }`}>2</div>
              <p className={`text-sm font-bold ${readyToAnalyze ? "text-indigo-700" : "text-gray-400"}`}>
                OCR 결과 확인 후 분석
              </p>
              {readyToAnalyze && (
                <span className="ml-auto text-xs text-indigo-500 font-medium animate-pulse">↓ 아래 버튼 클릭</span>
              )}
            </div>

            <textarea
              value={ocrText}
              onChange={e => { setOcrText(e.target.value); setOcrDone(!!e.target.value); }}
              placeholder="OCR 결과가 여기에 표시됩니다. 직접 입력도 가능합니다."
              className="flex-1 w-full resize-none border border-gray-200 rounded-xl p-3 text-sm text-gray-800 placeholder:text-gray-400 font-mono leading-relaxed focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 min-h-[160px]"
            />

            {/* 분석 버튼 - 핵심 액션 */}
            <button
              onClick={handleAnalyze}
              disabled={!readyToAnalyze}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all ${
                readyToAnalyze
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md ring-2 ring-indigo-300 ring-offset-1"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {analyzing
                ? <><Spinner /> 구조화 + 패턴 분석 중… (20~40초)</>
                : <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  구조화 + 패턴 추출 시작
                </>
              }
            </button>
          </div>
        </div>

        {/* ── 오른쪽: 분석 결과 + 저장 ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">

          {/* 그룹 선택 */}
          {!analyzing && groups.length > 1 && !selectedGroup && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-800 mb-1">여러 지문 그룹이 감지되었습니다.</p>
              <p className="text-xs text-gray-500 mb-3">저장할 지문 그룹을 선택하세요.</p>
              <div className="grid grid-cols-2 gap-3">
                {groups.map((g, i) => (
                  <button key={i} onClick={() => {
                    setSelectedGroup(g);
                    if (g.area && !meta.area) setMeta(m => ({ ...m, area: g.area }));
                  }}
                    className="text-left p-4 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all">
                    <p className="text-sm font-semibold text-gray-800">{g.passageGroupLabel || `그룹 ${i + 1}`}</p>
                    <p className="text-xs text-gray-500 mt-1">{g.area} · {g.questions.length}문항 · 패턴 {g.patterns.length}개</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 로딩 */}
          {analyzing && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 flex flex-col items-center gap-3">
              <svg className="w-10 h-10 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-600 font-medium">구조화 + 패턴 분석 중…</p>
              <p className="text-xs text-gray-400">기존보다 약 40% 빠릅니다 (약 20~40초)</p>
            </div>
          )}

          {/* 구조화 결과 미리보기 */}
          {selectedGroup && !analyzing && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-800">구조화 완료</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{selectedGroup.area}</span>
                  <span className="text-xs text-gray-500">{selectedGroup.questions.length}문항</span>
                </div>
                {groups.length > 1 && (
                  <button onClick={() => setSelectedGroup(null)} className="text-xs text-gray-500 hover:text-gray-700">다시 선택</button>
                )}
              </div>
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                {selectedGroup.questions.map(q => (
                  <div key={q.id} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs font-medium text-gray-700">{q.questionNumber}번. {q.questionText.slice(0, 60)}{q.questionText.length > 60 ? "…" : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 패턴 결과 */}
          {patterns.length > 0 && !analyzing && (
            <>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-semibold text-gray-800">추출된 패턴 ({patterns.length}문항)</p>
              </div>
              {patterns.map(p => <PatternCard key={p.question_number} pattern={p} />)}
            </>
          )}

          {/* 저장 폼 */}
          {patterns.length > 0 && !savedId && !analyzing && (
            <div className="bg-white rounded-2xl border border-purple-200 shadow-sm p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-3 border-b border-purple-100">
                <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-green-700">패턴 세트 저장</p>
              </div>

              <div>
                <label className={LABEL_CLS}>제목 <span className="text-purple-500">*</span></label>
                <input value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))}
                  placeholder="예: 2024 수완고 1학년 1차 지필 문학"
                  className={INPUT_CLS + (error ? " border-red-400" : "")} />
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLS}>학교명</label>
                  <input value={meta.school_name} onChange={e => setMeta(m => ({ ...m, school_name: e.target.value }))}
                    placeholder="예: 수완고" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>학년</label>
                  <select value={meta.grade} onChange={e => setMeta(m => ({ ...m, grade: e.target.value }))} className={SELECT_CLS}>
                    <option value="">선택</option>
                    {GRADES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>학기</label>
                  <select value={meta.semester} onChange={e => setMeta(m => ({ ...m, semester: e.target.value }))} className={SELECT_CLS}>
                    <option value="">선택</option>
                    {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>시험명</label>
                  <select value={meta.exam_name} onChange={e => setMeta(m => ({ ...m, exam_name: e.target.value }))} className={SELECT_CLS}>
                    <option value="">선택</option>
                    {EXAM_NAMES.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>영역</label>
                  <select value={meta.area} onChange={e => setMeta(m => ({ ...m, area: e.target.value }))} className={SELECT_CLS}>
                    <option value="">선택</option>
                    {AREAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <button onClick={handleSave} disabled={saving}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all ${
                  !saving ? "bg-green-600 text-white hover:bg-green-700 shadow-md" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}>
                {saving ? <><Spinner /> 저장 중…</> : "패턴 세트 저장"}
              </button>
            </div>
          )}

          {/* 빈 상태 */}
          {!selectedGroup && !analyzing && groups.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 flex flex-col items-center justify-center gap-4 flex-1">
              <div className="flex items-center gap-3 text-gray-300">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-400 font-bold mx-auto mb-1">1</div>
                  <p className="text-xs">업로드</p>
                </div>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-400 font-bold mx-auto mb-1">2</div>
                  <p className="text-xs">OCR</p>
                </div>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-400 font-bold mx-auto mb-1">3</div>
                  <p className="text-xs">분석</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 text-center leading-relaxed">
                왼쪽에서 시험지를 업로드하고<br />OCR 후 「구조화 + 패턴 추출 시작」을 클릭하세요.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
