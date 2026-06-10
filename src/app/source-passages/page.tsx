"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import AuthUserMenu from "@/components/AuthUserMenu";
import { CandidateQuestionPoint } from "@/types/passages";
import { createBrowserSupabase } from "@/lib/supabase-browser";

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

const INPUT_CLS  = "w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white";
const SELECT_CLS = "w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white";
const LABEL_CLS  = "text-xs font-semibold text-gray-700 mb-1 block";

function Spinner({ size = 4 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

type InputMode = "image" | "text";

export default function SourcePassagesPage() {
  // 입력 모드
  const [mode, setMode] = useState<InputMode>("image");

  // 이미지 업로드
  const [images, setImages]     = useState<File[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);

  // 지문 텍스트
  const [passageText, setPassageText] = useState("");
  const [ocrRaw, setOcrRaw]           = useState("");

  // 메타
  const [title, setTitle]           = useState("");
  const [area, setArea]             = useState("");
  const [sourceType, setSourceType] = useState("");

  // 분석 결과
  const [analysisSummary, setAnalysisSummary]         = useState("");
  const [keyPoints, setKeyPoints]                     = useState("");
  const [candidatePoints, setCandidatePoints]         = useState<CandidateQuestionPoint[]>([]);
  const [analyzing, setAnalyzing]                     = useState(false);

  // 저장
  const [saving, setSaving]   = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError]     = useState("");

  const analysisReady = !!analysisSummary;

  // ── 이미지 드롭 ─────────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    setImages((prev) => [...prev, ...files].slice(0, 5));
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    setImages((prev) => [...prev, ...files].slice(0, 5));
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
      setOcrRaw(text ?? "");
      setPassageText(text ?? "");
    } catch (e) {
      alert(e instanceof Error ? e.message : "OCR 실패");
    } finally {
      setOcrLoading(false);
    }
  };

  // ── 지문 분석 ────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!passageText.trim()) { alert("지문 내용을 입력하세요."); return; }
    setAnalyzing(true);
    setAnalysisSummary(""); setKeyPoints(""); setCandidatePoints([]);
    try {
      const res = await fetch("/api/source-passages/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passage_text: passageText, area, source_type: sourceType }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "분석 오류");
      const data = await res.json();
      setAnalysisSummary(data.analysis_summary ?? "");
      setKeyPoints(data.key_points ?? "");
      setCandidatePoints(data.candidate_question_points ?? []);
    } catch (e) {
      alert(e instanceof Error ? e.message : "지문 분석 실패");
    } finally {
      setAnalyzing(false);
    }
  };

  // ── 저장 ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) { setError("제목을 입력하세요."); return; }
    if (!passageText.trim()) { setError("지문 내용을 입력하세요."); return; }
    setSaving(true); setError("");
    try {
      // 이미지가 있으면 Storage에 업로드 후 URL 수집
      let imageUrls: string[] = [];
      if (mode === "image" && images.length > 0) {
        const supabase = createBrowserSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const uploads = await Promise.all(images.map(async (file, i) => {
            const ext = file.name.split(".").pop() ?? "jpg";
            const path = `${user.id}/${Date.now()}_${i}.${ext}`;
            const { error } = await supabase.storage
              .from("passage-images")
              .upload(path, file, { upsert: true });
            if (error) throw new Error(`이미지 업로드 실패: ${error.message}`);
            const { data: { publicUrl } } = supabase.storage
              .from("passage-images")
              .getPublicUrl(path);
            return publicUrl;
          }));
          imageUrls = uploads;
        }
      }

      const res = await fetch("/api/source-passages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, area, source_type: sourceType,
          passage_text: passageText,
          ocr_raw_text: ocrRaw,
          analysis_summary: analysisSummary,
          key_points: keyPoints,
          candidate_question_points: candidatePoints,
          image_urls: imageUrls,
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

  // ── 초기화 ──────────────────────────────────────────────────────────────
  const handleReset = () => {
    setImages([]); setPassageText(""); setOcrRaw("");
    setTitle(""); setArea(""); setSourceType("");
    setAnalysisSummary(""); setKeyPoints(""); setCandidatePoints([]);
    setSavedId(null); setError("");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/source-passages/library"
            className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">새 지문 등록</h1>
            <p className="text-xs text-gray-500 -mt-0.5">교과서·문학·독서 지문 등록 및 출제 요소 분석</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/source-passages/library"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              지문 라이브러리
            </Link>
            <Link href="/pattern-remix"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors">
              패턴 재구성
            </Link>
            <Link href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
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
              지문이 저장되었습니다.
            </div>
            <div className="flex gap-2">
              <Link href="/pattern-remix/generate"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors flex items-center gap-1">
                다음: 문제 생성 →
              </Link>
              <Link href="/source-passages/library"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 transition-colors">
                라이브러리에서 보기
              </Link>
              <button onClick={handleReset}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                새 지문 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메인 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 flex gap-6 min-h-0">

        {/* ── 왼쪽: 지문 입력 ────────────────────────────────────────────── */}
        <div className="w-[45%] flex-shrink-0 flex flex-col gap-4">

          {/* 입력 모드 토글 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1 flex">
            {(["image", "text"] as InputMode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  mode === m ? "bg-teal-600 text-white" : "text-gray-500 hover:text-gray-700"
                }`}>
                {m === "image" ? "이미지 업로드" : "텍스트 직접 입력"}
              </button>
            ))}
          </div>

          {/* 이미지 업로드 모드 */}
          {mode === "image" && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
              <p className="text-sm font-semibold text-gray-700">지문 이미지 업로드</p>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => document.getElementById("passage-file-input")?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-2 text-center hover:border-teal-300 hover:bg-teal-50/30 transition-colors cursor-pointer">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-xs text-gray-500">지문 이미지를 드래그하거나 클릭 (최대 5장)</p>
                <input id="passage-file-input" type="file" multiple accept="image/*" className="hidden" onChange={handleFileInput} />
              </div>

              {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {images.map((f, i) => (
                    <div key={i} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(f)} alt={f.name}
                        className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                      <button onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={handleOcr} disabled={images.length === 0 || ocrLoading}
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  images.length > 0 && !ocrLoading
                    ? "bg-teal-600 text-white hover:bg-teal-700"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}>
                {ocrLoading ? <><Spinner /> OCR 실행 중...</> : "OCR 실행"}
              </button>
            </div>
          )}

          {/* 지문 텍스트 에디터 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">지문 내용</p>
              <span className="text-xs text-gray-400">{passageText.length > 0 ? `${passageText.length.toLocaleString()}자` : ""}</span>
            </div>
            <textarea
              value={passageText}
              onChange={(e) => { setPassageText(e.target.value); setAnalysisSummary(""); setCandidatePoints([]); }}
              placeholder={
                mode === "image" && !passageText
                  ? "위에서 OCR을 실행하면 텍스트가 여기에 표시됩니다.\n직접 수정도 가능합니다."
                  : "지문을 직접 입력하거나 붙여넣으세요."
              }
              className="flex-1 w-full resize-none border border-gray-200 rounded-xl p-3 text-sm text-gray-800 placeholder:text-gray-400 leading-relaxed focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 min-h-[280px]"
            />
          </div>
        </div>

        {/* ── 오른쪽: 메타 + 분석 + 저장 ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">

          {/* 메타 정보 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
            <p className="text-sm font-bold text-gray-800">지문 정보</p>

            <div>
              <label className={LABEL_CLS}>제목 <span className="text-teal-500">*</span></label>
              <input value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }}
                placeholder="예: 김소월 - 진달래꽃, 독서 - 기후 변화와 생태계"
                className={INPUT_CLS + (error && !title ? " border-red-400" : "")} />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>영역</label>
                <select value={area} onChange={(e) => setArea(e.target.value)} className={SELECT_CLS}>
                  <option value="">선택</option>
                  {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>출처 유형</label>
                <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className={SELECT_CLS}>
                  <option value="">선택</option>
                  {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <button onClick={handleAnalyze}
              disabled={!passageText.trim() || analyzing}
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                passageText.trim() && !analyzing
                  ? "bg-teal-600 text-white hover:bg-teal-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}>
              {analyzing ? <><Spinner /> 지문 분석 중... (20~40초)</> : "지문 분석 시작"}
            </button>
          </div>

          {/* 로딩 */}
          {analyzing && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 flex flex-col items-center gap-3">
              <svg className="w-10 h-10 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-500 font-medium">지문 핵심 내용과 출제 요소를 분석 중입니다...</p>
            </div>
          )}

          {/* 분석 결과 */}
          {analysisReady && !analyzing && (
            <>
              {/* 요약 */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
                <p className="text-sm font-bold text-gray-800">지문 분석 결과</p>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">요약</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{analysisSummary}</p>
                </div>
                <div className="bg-teal-50 border border-teal-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-teal-600 mb-1">핵심 내용</p>
                  <p className="text-sm text-teal-800 leading-relaxed whitespace-pre-wrap">{keyPoints}</p>
                </div>
              </div>

              {/* 출제 가능 요소 */}
              {candidatePoints.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
                  <p className="text-sm font-bold text-gray-800">출제 가능 요소 ({candidatePoints.length}개)</p>
                  {candidatePoints.map((pt, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">{pt.element}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${QTYPE_BADGE[pt.question_type] ?? "bg-gray-100 text-gray-600"}`}>
                          {pt.question_type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed pl-7">{pt.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 저장 버튼 */}
              {!savedId && (
                <div className="bg-white rounded-2xl border border-teal-200 shadow-sm p-5">
                  <p className="text-xs text-gray-500 mb-3">분석이 완료되었습니다. 지문을 라이브러리에 저장하세요.</p>
                  <button onClick={handleSave} disabled={saving}
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      !saving ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}>
                    {saving ? <><Spinner /> 저장 중...</> : "지문 라이브러리에 저장"}
                  </button>
                </div>
              )}
            </>
          )}

          {/* 분석 전 저장 (분석 없이도 저장 가능) */}
          {!analysisReady && !analyzing && passageText.trim() && !savedId && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">분석 없이 바로 저장할 수도 있습니다.</p>
              <button onClick={handleSave} disabled={saving || !title.trim()}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
                  !saving && title.trim()
                    ? "bg-gray-700 text-white hover:bg-gray-800"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}>
                {saving ? <><Spinner size={3} /> 저장 중...</> : "바로 저장"}
              </button>
            </div>
          )}

          {/* 빈 상태 */}
          {!passageText && !analyzing && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 flex flex-col items-center justify-center gap-3 flex-1">
              <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 text-center">
                왼쪽에서 이미지를 업로드하거나<br />텍스트를 직접 입력한 후 분석하세요.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
