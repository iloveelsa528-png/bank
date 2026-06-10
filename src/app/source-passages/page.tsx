"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CandidateQuestionPoint } from "@/types/passages";
import JobRunner from "@/components/JobRunner";
import type { Job } from "@/types/jobs";

const PASSAGE_SYNC_LIMIT = 3000;
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
const LABEL_CLS  = "text-xs font-semibold text-gray-600 mb-1 block";

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
  const router = useRouter();
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

  const [passageJobId, setPassageJobId]     = useState<string | null>(null);
  const [passageJobDone, setPassageJobDone] = useState(false);
  const [sourceJobId, setSourceJobId]       = useState<string | null>(null);

  const [saving, setSaving]   = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError]     = useState("");

  const analysisReady = !!analysisSummary;

  const autoTitle = passageText.trim()
    ? passageText.trim().split("\n").find(l => l.trim())?.slice(0, 30) ?? "지문"
    : "";
  const effectiveTitle = title.trim() || autoTitle;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    setImages(prev => [...prev, ...files].slice(0, 20));
    setOcrDone(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith("image/"));
    setImages(prev => [...prev, ...files].slice(0, 20));
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
      if (!res.ok) throw new Error((await res.json()).error || "오류");
      const { text } = await res.json();
      setOcrRaw(text ?? "");
      setPassageText(text ?? "");
      setOcrDone(true);
      if (text?.trim()) await runAnalyze(text.trim());
    } catch (e) {
      alert(e instanceof Error ? e.message : "글자 읽기 실패");
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
        if (!res.ok) throw new Error(data.error ?? "분석 시작 실패");
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
    if (!passageText.trim()) { alert("지문 내용을 먼저 입력해주세요."); return; }
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
      const res = await fetch("/api/source-passages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: effectiveTitle, area, source_type: sourceType,
          passage_text: passageText, ocr_raw_text: ocrRaw,
          analysis_summary: analysisSummary, key_points: keyPoints,
          candidate_question_points: candidatePoints, image_urls: [],
          ...(sourceJobId ? { source_job_id: sourceJobId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setSavedId(data.id);
      setTimeout(() => router.push("/pattern-remix/generate"), 1500);
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
    <div className="min-h-screen bg-gray-50">

      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900">2단계 — 새 지문 입력</h1>
            <p className="text-xs text-gray-400">출제할 지문을 사진 또는 텍스트로 등록합니다</p>
          </div>
          <Link href="/pattern-remix/generate"
            className="flex-shrink-0 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors">
            문제 생성 →
          </Link>
        </div>
      </header>

      {/* 저장 완료 배너 */}
      {savedId && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-green-700 text-sm font-semibold">저장 완료! 문제 생성 페이지로 이동합니다…</span>
            </div>
            <div className="flex gap-2">
              <Link href="/pattern-remix/generate"
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700">
                지금 이동하기 →
              </Link>
              <button onClick={handleReset}
                className="px-3 py-1.5 rounded-lg text-xs text-gray-600 bg-white border border-gray-200 hover:bg-gray-50">
                새 지문 등록
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-4 pb-40 flex flex-col gap-4">

        {/* 입력 방식 선택 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1 flex">
          {(["image", "text"] as InputMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                mode === m ? "bg-green-600 text-white" : "text-gray-500 hover:text-gray-700"
              }`}>
              {m === "image" ? "📷  사진으로 입력" : "⌨  텍스트 직접 입력"}
            </button>
          ))}
        </div>

        {/* 이미지 업로드 카드 */}
        {mode === "image" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
            <p className="text-sm font-bold text-gray-800">지문 사진 업로드</p>
            {images.length === 0 ? (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => document.getElementById("passage-file-input")?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-green-300 hover:bg-green-50/30 transition-colors">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-sm text-gray-500 font-medium">여기를 눌러 사진을 선택하세요</p>
                <p className="text-xs text-gray-400">드래그해서 올려도 됩니다 · 최대 20장</p>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="flex flex-col gap-2">
                {images.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(f)} alt={f.name}
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{f.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{i + 1}페이지 · {fmtSize(f.size)}</p>
                      {ocrDone && i === 0 && (
                        <span className="text-xs text-green-600">✓ 글자 읽기 완료</span>
                      )}
                    </div>
                    <button
                      onClick={() => { setImages(p => p.filter((_, j) => j !== i)); setOcrDone(false); }}
                      className="w-6 h-6 bg-red-100 text-red-500 rounded-full text-xs hover:bg-red-200 flex items-center justify-center flex-shrink-0">×</button>
                  </div>
                ))}
                <button
                  onClick={() => document.getElementById("passage-file-input")?.click()}
                  className="py-2 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 hover:border-green-300 hover:text-green-500 transition-colors">
                  + 사진 더 추가하기 ({images.length}/20)
                </button>
              </div>
            )}
            <input id="passage-file-input" type="file" multiple accept="image/*" className="hidden" onChange={handleFileInput} />

            <button onClick={handleOcr} disabled={images.length === 0 || ocrLoading}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all ${
                images.length > 0 && !ocrLoading
                  ? ocrDone
                    ? "bg-green-50 text-green-700 border border-green-300 hover:bg-green-100"
                    : "bg-green-600 text-white hover:bg-green-700 shadow-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}>
              {ocrLoading
                ? <><Spinner /> 글자 읽는 중… (잠시만 기다려주세요)</>
                : ocrDone
                  ? "✓ 글자 읽기 완료 — 다시 읽기"
                  : "📖  글자 읽기 시작"}
            </button>
            {images.length > 0 && !ocrDone && !ocrLoading && (
              <p className="text-xs text-gray-400 text-center">버튼을 누르면 사진에서 글자를 자동으로 읽어옵니다</p>
            )}
          </div>
        )}

        {/* 지문 텍스트 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800">
              {mode === "image" ? "인식된 지문 텍스트" : "지문 내용"}
            </p>
            {passageText && <span className="text-xs text-gray-400">{passageText.length.toLocaleString()}자</span>}
          </div>

          <textarea
            value={passageText}
            onChange={e => { setPassageText(e.target.value); setAnalysisSummary(""); setCandidatePoints([]); }}
            placeholder={
              mode === "image" && !passageText
                ? "위에서 '글자 읽기'를 누르면 텍스트가 여기에 표시됩니다.\n내용을 직접 수정하거나 붙여넣어도 됩니다."
                : "지문을 여기에 입력하거나 붙여넣으세요.\n(교과서, 수능 지문, 직접 작성 모두 가능)"
            }
            rows={mode === "text" ? 10 : 8}
            className="w-full resize-y border border-gray-200 rounded-xl p-3 text-sm text-gray-800 placeholder:text-gray-400 leading-relaxed focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
          />

          {/* 분석 버튼 */}
          {(!passageJobId || passageJobDone) && (
            <button
              onClick={handleAnalyze}
              disabled={!passageText.trim() || analyzing}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all ${
                passageText.trim() && !analyzing
                  ? "bg-green-600 text-white hover:bg-green-700 shadow-md"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}>
              {analyzing
                ? <><Spinner /> 출제 포인트 찾는 중… (20~40초)</>
                : passageText.trim()
                  ? <>✨ 출제 포인트 자동 분석</>
                  : "지문을 먼저 입력해 주세요"
              }
            </button>
          )}

          {passageJobId && !passageJobDone && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex flex-col gap-2">
              <p className="text-xs text-green-600 font-medium">긴 지문 분석 중…</p>
              <JobRunner jobId={passageJobId} onComplete={handleJobComplete} />
              <button onClick={() => { setPassageJobId(null); setPassageJobDone(false); }}
                className="text-xs text-gray-400 hover:text-gray-600 underline self-start">취소</button>
            </div>
          )}
        </div>

        {/* 분석 로딩 */}
        {analyzing && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col items-center gap-3">
            <svg className="w-10 h-10 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-600 font-medium">출제 포인트를 찾고 있습니다…</p>
            <p className="text-xs text-gray-400">보통 20~40초 정도 걸립니다</p>
          </div>
        )}

        {/* 분석 결과 */}
        {analysisReady && !analyzing && (
          <>
            <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-gray-800">분석 완료</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">지문 요약</p>
                <p className="text-sm text-gray-700 leading-relaxed">{analysisSummary}</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-green-600 mb-1">핵심 내용</p>
                <p className="text-sm text-green-800 leading-relaxed whitespace-pre-wrap">{keyPoints}</p>
              </div>
            </div>

            {candidatePoints.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
                <p className="text-sm font-bold text-gray-800">
                  출제 가능 포인트 <span className="text-green-600">{candidatePoints.length}개</span>
                </p>
                {candidatePoints.map((pt, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
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

        {/* 지문 정보 (선택 사항) */}
        {passageText.trim() && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
            <div>
              <p className="text-sm font-bold text-gray-800">지문 정보
                <span className="ml-1 text-xs font-normal text-gray-400">(선택 — 비워두면 자동 입력)</span>
              </p>
            </div>
            <div>
              <label className={LABEL_CLS}>제목</label>
              <input value={title} onChange={e => { setTitle(e.target.value); setError(""); }}
                placeholder={autoTitle || "예: 김소월 - 진달래꽃"}
                className={INPUT_CLS} />
              {autoTitle && !title && (
                <p className="text-xs text-gray-400 mt-1">자동 제목: 「{autoTitle}」</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>영역</label>
                <select value={area} onChange={e => setArea(e.target.value)} className={SELECT_CLS}>
                  <option value="">선택 안 함</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>출처 유형</label>
                <select value={sourceType} onChange={e => setSourceType(e.target.value)} className={SELECT_CLS}>
                  <option value="">선택 안 함</option>
                  {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

      </main>

      {/* Sticky 저장 바 */}
      {canSave && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-[60]">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">「{effectiveTitle}」</p>
              {analysisReady
                ? <p className="text-xs text-green-600 mt-0.5">✓ 분석 완료 · 출제 포인트 {candidatePoints.length}개</p>
                : <p className="text-xs text-gray-400 mt-0.5">분석 없이도 저장 가능합니다</p>
              }
            </div>
            <button onClick={handleSave} disabled={saving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 transition-all ${
                !saving ? "bg-green-600 text-white hover:bg-green-700 shadow-md" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}>
              {saving ? <><Spinner size={4} /> 저장 중…</> : "지문 저장하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
