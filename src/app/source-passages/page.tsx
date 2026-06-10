"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { CandidateQuestionPoint } from "@/types/passages";
import JobRunner from "@/components/JobRunner";
import type { Job } from "@/types/jobs";

const PASSAGE_SYNC_LIMIT = 3000; // 이 길이 이하면 동기 분석, 초과면 job 분석

const AREAS = ["문학", "독서", "문법", "화작"];
const SOURCE_TYPES = ["교과서", "문학작품", "독서지문", "학교자료", "직접입력"];

const QTYPE_BADGE: Record<string, string> = {
  내용이해:   "bg-blue-100 text-blue-700",
  추론:       "bg-purple-100 text-purple-700",
  표현분석:   "bg-pink-100 text-pink-700",
  어휘문법:   "bg-green-100 text-green-700",
  비판적사고: "bg-orange-100 text-orange-700",
  적용:       "bg-cyan-100 text-cyan-700",
};

const INPUT_CLS  = "w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white";
const SELECT_CLS = "w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white";
const LABEL_CLS  = "text-xs font-semibold text-gray-700 mb-1 block";

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

type InputMode = "image" | "text";

export default function SourcePassagesPage() {
  const [mode, setMode]             = useState<InputMode>("image");
  const [images, setImages]         = useState<File[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDone, setOcrDone]       = useState(false);

  const [passageText, setPassageText] = useState("");
  const [ocrRaw, setOcrRaw]           = useState("");

  const [title, setTitle]           = useState("");
  const [area, setArea]             = useState("");
  const [sourceType, setSourceType] = useState("");

  const [analysisSummary, setAnalysisSummary] = useState("");
  const [keyPoints, setKeyPoints]             = useState("");
  const [candidatePoints, setCandidatePoints] = useState<CandidateQuestionPoint[]>([]);
  const [analyzing, setAnalyzing]             = useState(false);

  // Job 기반 분석 (>3000자)
  const [passageJobId, setPassageJobId]           = useState<string | null>(null);
  const [passageJobDone, setPassageJobDone]       = useState(false);
  const [sourceJobId, setSourceJobId]             = useState<string | null>(null);

  const [saving, setSaving]   = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError]     = useState("");

  const analysisReady = !!analysisSummary;

  // 제목 자동 채움: 텍스트 첫 줄 (최대 30자)
  const autoTitle = passageText.trim()
    ? passageText.trim().split("\n").find(l => l.trim())?.slice(0, 30) ?? "지문"
    : "";
  const effectiveTitle = title.trim() || autoTitle;

  // OCR 미리보기: 첫 두 줄
  const ocrPreview = passageText
    ? passageText.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 2).join(" ").slice(0, 100)
    : undefined;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    setImages(prev => [...prev, ...files].slice(0, 5));
    setOcrDone(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith("image/"));
    setImages(prev => [...prev, ...files].slice(0, 5));
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
      setOcrRaw(text ?? "");
      setPassageText(text ?? "");
      setOcrDone(true);
      // OCR 완료 후 자동 분석 시작
      if (text?.trim()) {
        await runAnalyze(text.trim());
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "OCR 실패");
    } finally {
      setOcrLoading(false);
    }
  };

  const applyAnalysisResult = (data: { analysis_summary?: string; key_points?: string; candidate_question_points?: CandidateQuestionPoint[] }) => {
    setAnalysisSummary(data.analysis_summary ?? "");
    setKeyPoints(data.key_points ?? "");
    setCandidatePoints(data.candidate_question_points ?? []);
  };

  const runAnalyze = async (text: string) => {
    setAnalysisSummary(""); setKeyPoints(""); setCandidatePoints([]);
    setPassageJobId(null); setPassageJobDone(false); setSourceJobId(null);

    if (text.length > PASSAGE_SYNC_LIMIT) {
      setAnalyzing(true);
      try {
        const res = await fetch("/api/source-passages/analyze-job", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passage_text: text, area, source_type: sourceType }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "분석 job 생성 실패");
        setPassageJobId(data.jobId);
      } catch (e) {
        alert(e instanceof Error ? e.message : "분석 시작 실패");
      } finally {
        setAnalyzing(false);
      }
      return;
    }

    setAnalyzing(true);
    try {
      const res = await fetch("/api/source-passages/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passage_text: text, area, source_type: sourceType }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "분석 오류");
      applyAnalysisResult(await res.json());
    } catch (e) {
      alert(e instanceof Error ? e.message : "지문 분석 실패");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyze = () => {
    if (!passageText.trim()) { alert("지문 내용을 입력하세요."); return; }
    runAnalyze(passageText.trim());
  };

  const handleJobComplete = (job: Job) => {
    if (!job.result) return;
    const result = job.result as { analysis_summary?: string; key_points?: string; candidate_question_points?: CandidateQuestionPoint[] };
    applyAnalysisResult(result);
    setPassageJobDone(true);
    setSourceJobId(job.id);
  };

  const handleSave = async () => {
    if (!passageText.trim()) { setError("지문 내용을 입력하세요."); return; }
    setSaving(true); setError("");
    try {
      const imageUrls: string[] = [];
      const res = await fetch("/api/source-passages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: effectiveTitle, area, source_type: sourceType,
          passage_text: passageText, ocr_raw_text: ocrRaw,
          analysis_summary: analysisSummary, key_points: keyPoints,
          candidate_question_points: candidatePoints, image_urls: imageUrls,
          ...(sourceJobId ? { source_job_id: sourceJobId } : {}),
        }),
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
    setImages([]); setPassageText(""); setOcrRaw(""); setOcrDone(false);
    setTitle(""); setArea(""); setSourceType("");
    setAnalysisSummary(""); setKeyPoints(""); setCandidatePoints([]);
    setPassageJobId(null); setPassageJobDone(false); setSourceJobId(null);
    setSavedId(null); setError("");
  };

  const canSave = !!passageText.trim() && !savedId;

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
            <h1 className="text-base font-bold text-gray-900">2단계 — 새 지문 넣기</h1>
            <p className="text-xs text-gray-400 mt-0.5">사진 또는 텍스트로 지문을 등록합니다</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/source-passages/library"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 transition-colors">
              지문 라이브러리
            </Link>
            <Link href="/pattern-remix/generate"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-700 transition-colors">
              문제 생성 →
            </Link>
          </div>
        </div>
      </header>

      {/* 완료 배너 */}
      {savedId && (
        <div className="bg-green-50 border-b border-green-200 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between flex-wrap gap-2">
            <span className="text-green-700 text-sm font-medium">지문이 저장되었습니다.</span>
            <div className="flex gap-2 flex-wrap">
              <Link href="/pattern-remix/generate"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-700 transition-colors">
                다음: 문제 생성 →
              </Link>
              <Link href="/source-passages/library"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 transition-colors">
                라이브러리 보기
              </Link>
              <button onClick={handleReset}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                새 지문 등록
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 pb-24 flex gap-6 min-h-0">

        {/* ── 왼쪽: 지문 입력 + 분석 버튼 ──────────────────────────────── */}
        <div className="w-[45%] flex-shrink-0 flex flex-col gap-4">

          {/* 모드 토글 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1 flex">
            {(["image", "text"] as InputMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  mode === m ? "bg-green-600 text-white" : "text-gray-500 hover:text-gray-700"
                }`}>
                {m === "image" ? "📷 이미지 업로드" : "⌨ 텍스트 직접 입력"}
              </button>
            ))}
          </div>

          {/* 이미지 업로드 */}
          {mode === "image" && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                  ocrDone ? "bg-green-500 text-white" : "bg-green-600 text-white"
                }`}>
                  {ocrDone
                    ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    : 1}
                </div>
                <p className={`text-sm font-bold ${ocrDone ? "text-green-700" : "text-green-700"}`}>
                  지문 이미지 업로드 {ocrDone && <span className="font-normal text-green-600">· OCR 완료</span>}
                </p>
              </div>

              {/* 드롭존 (이미지 없을 때) */}
              {images.length === 0 && (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => document.getElementById("passage-file-input")?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-2 text-center hover:border-green-300 hover:bg-green-50/30 transition-colors cursor-pointer">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-xs text-gray-500">지문 이미지를 드래그하거나 클릭 (최대 5장)</p>
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
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(f)}
                        alt={f.name}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-xs font-semibold text-gray-800 truncate" title={f.name}>{f.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtSize(f.size)} · 페이지 {i + 1}</p>
                        {ocrDone && ocrPreview && i === 0 && (
                          <p className="text-xs text-gray-500 mt-1.5 italic line-clamp-2 leading-relaxed">"{ocrPreview}"</p>
                        )}
                        {ocrDone && i > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            OCR 완료
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => { setImages(p => p.filter((_, j) => j !== i)); setOcrDone(false); }}
                        className="absolute top-2 right-2 w-5 h-5 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-xs hover:bg-red-200 transition-colors"
                      >×</button>
                    </div>
                  ))}
                  <button
                    onClick={() => document.getElementById("passage-file-input")?.click()}
                    className="flex items-center justify-center gap-1 py-2 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 hover:border-green-300 hover:text-green-500 transition-colors"
                  >+ 이미지 추가</button>
                </div>
              )}

              <input id="passage-file-input" type="file" multiple accept="image/*" className="hidden" onChange={handleFileInput} />

              <button onClick={handleOcr} disabled={images.length === 0 || ocrLoading}
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  images.length > 0 && !ocrLoading
                    ? ocrDone
                      ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200"
                      : "bg-green-600 text-white hover:bg-green-700 shadow-sm"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}>
                {ocrLoading ? <><Spinner /> OCR 실행 중…</> : ocrDone ? "OCR 재실행" : "OCR 실행"}
              </button>
            </div>
          )}

          {/* 지문 텍스트 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 flex-1 min-h-0">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                  passageText.trim() ? "bg-green-600 text-white" : "bg-gray-200 text-gray-400"
                }`}>{mode === "image" ? 2 : 1}</div>
                <p className={`text-sm font-bold ${passageText.trim() ? "text-green-700" : "text-gray-400"}`}>지문 내용</p>
              </div>
              {passageText && <span className="text-xs text-gray-400">{passageText.length.toLocaleString()}자</span>}
            </div>

            <textarea
              value={passageText}
              onChange={e => { setPassageText(e.target.value); setAnalysisSummary(""); setCandidatePoints([]); }}
              placeholder={
                mode === "image" && !passageText
                  ? "위에서 OCR을 실행하면 텍스트가 여기에 표시됩니다.\n직접 수정도 가능합니다."
                  : "지문을 직접 입력하거나 붙여넣으세요."
              }
              className="flex-1 w-full resize-none border border-gray-200 rounded-xl p-3 text-sm text-gray-800 placeholder:text-gray-400 leading-relaxed focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 min-h-[200px]"
            />

            {/* 지문 분석 버튼 — 텍스트 바로 아래 */}
            {(!passageJobId || passageJobDone) && (
              <button
                onClick={handleAnalyze}
                disabled={!passageText.trim() || analyzing}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all ${
                  passageText.trim() && !analyzing
                    ? "bg-green-600 text-white hover:bg-green-700 shadow-md ring-2 ring-green-300 ring-offset-1"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}>
                {analyzing
                  ? <><Spinner /> 지문 분석 중… (20~40초)</>
                  : <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    지문 분석 시작
                    {passageText.trim() && passageText.length > PASSAGE_SYNC_LIMIT && (
                      <span className="ml-1 text-green-200 font-normal text-xs">(장문 — Job 분석)</span>
                    )}
                    {passageText.trim() && passageText.length <= PASSAGE_SYNC_LIMIT && (
                      <span className="ml-1 text-green-200 font-normal text-xs">(출제 요소 자동 추출)</span>
                    )}
                  </>
                }
              </button>
            )}

            {/* Job 기반 분석 진행 (>3000자) */}
            {passageJobId && !passageJobDone && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-green-600">장문 지문 분석 중 (Job)…</p>
                <JobRunner jobId={passageJobId} onComplete={handleJobComplete} />
                <button onClick={() => { setPassageJobId(null); setPassageJobDone(false); }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline self-start">취소</button>
              </div>
            )}
          </div>
        </div>

        {/* ── 오른쪽: 메타 + 분석 결과 ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">

          {/* 지문 정보 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
            <p className="text-sm font-bold text-gray-800">지문 정보</p>
            <div>
              <label className={LABEL_CLS}>제목 <span className="text-green-500">*</span></label>
              <input value={title} onChange={e => { setTitle(e.target.value); setError(""); }}
                placeholder="예: 김소월 - 진달래꽃 / 기후 변화와 생태계"
                className={INPUT_CLS + (error && !title ? " border-red-400" : "")} />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>영역</label>
                <select value={area} onChange={e => setArea(e.target.value)} className={SELECT_CLS}>
                  <option value="">선택</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>출처 유형</label>
                <select value={sourceType} onChange={e => setSourceType(e.target.value)} className={SELECT_CLS}>
                  <option value="">선택</option>
                  {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 로딩 */}
          {analyzing && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 flex flex-col items-center gap-3">
              <svg className="w-10 h-10 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-500 font-medium">지문 핵심 내용과 출제 요소를 분석 중…</p>
            </div>
          )}

          {/* 분석 결과 */}
          {analysisReady && !analyzing && (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm font-bold text-gray-800">지문 분석 완료</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">요약</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{analysisSummary}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-green-600 mb-1">핵심 내용</p>
                  <p className="text-sm text-green-800 leading-relaxed whitespace-pre-wrap">{keyPoints}</p>
                </div>
              </div>

              {candidatePoints.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
                  <p className="text-sm font-bold text-gray-800">출제 가능 요소 ({candidatePoints.length}개)</p>
                  {candidatePoints.map((pt, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <span className="text-sm font-semibold text-gray-800">{pt.element}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${QTYPE_BADGE[pt.question_type] ?? "bg-gray-100 text-gray-600"}`}>{pt.question_type}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed pl-7">{pt.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* 빈 상태 */}
          {!passageText && !analyzing && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 flex flex-col items-center justify-center gap-3 flex-1">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-sm text-gray-400 text-center">왼쪽에서 이미지 업로드 또는<br />텍스트를 입력하세요.</p>
            </div>
          )}
        </div>
      </main>

      {/* ── Sticky 하단 저장 바 ─────────────────────────────────────────── */}
      {canSave && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-6 py-3 z-50">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">「{effectiveTitle}」 저장 준비 완료</p>
              {analysisReady
                ? <p className="text-xs text-green-600 mt-0.5">분석 완료 · 출제 요소 {candidatePoints.length}개</p>
                : <p className="text-xs text-gray-400 mt-0.5">분석 없이도 저장 가능합니다</p>
              }
            </div>
            {error && <p className="text-xs text-red-500 flex-shrink-0">{error}</p>}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${
                !saving
                  ? "bg-green-600 text-white hover:bg-green-700 shadow-md"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}>
              {saving ? <><Spinner size={4} /> 저장 중…</> : "지문 저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
