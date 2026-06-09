"use client";

import { useState } from "react";
import Link from "next/link";
import { AppProvider, useAppContext } from "@/context/AppContext";
import ImageUploader from "@/components/ImageUploader";
import OCREditor from "@/components/OCREditor";
import StructuredView from "@/components/StructuredView";
import AnalysisView from "@/components/AnalysisView";
import GenerationView from "@/components/GenerationView";
import SaveModal from "@/components/SaveModal";
import AuthUserMenu from "@/components/AuthUserMenu";
import { StructuredResult, AnalysisResult, GenerationResult } from "@/types/index";

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function MainContent() {
  const {
    uploadedImages,
    ocrRawText,
    editedOcrText,
    isOcrLoading,
    isOcrComplete,
    currentStep,
    structuredResult,
    structuredResults,
    selectedGroupIndex,
    isStructureLoading,
    isStructureComplete,
    analysisResult,
    isAnalysisLoading,
    isAnalysisComplete,
    generationResult,
    isGenerationLoading,
    isGenerationComplete,
    setOcrRawText,
    setEditedOcrText,
    setIsOcrLoading,
    setIsOcrComplete,
    setCurrentStep,
    setStructuredResult,
    setStructuredResults,
    setSelectedGroupIndex,
    setIsStructureLoading,
    setIsStructureComplete,
    setAnalysisResult,
    setIsAnalysisLoading,
    setIsAnalysisComplete,
    setGenerationResult,
    setIsGenerationLoading,
    setIsGenerationComplete,
  } = useAppContext();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const canRunOcr = uploadedImages.length > 0 && !isOcrLoading;
  const canComplete = editedOcrText.trim().length > 0 && !isOcrLoading;
  const canGoToStep2 = isOcrComplete;
  const canGoToStep3 = isStructureComplete;
  const canGoToStep4 = isAnalysisComplete;
  const canStructure = !isStructureLoading;
  const canFinishStructure = !!structuredResult && selectedGroupIndex >= 0 && !isStructureLoading;
  const canAnalyze = !!structuredResult && !isAnalysisLoading;
  const canFinishAnalysis = !!analysisResult && !isAnalysisLoading;
  const canGenerate = !!structuredResult && !!analysisResult && !isGenerationLoading;
  const canFinishGeneration = !!generationResult && !isGenerationLoading;

  // ── OCR 실행 ────────────────────────────────────────────────────────────
  const handleOcrRun = async () => {
    if (uploadedImages.length === 0) return;
    setIsOcrLoading(true);
    setIsOcrComplete(false);
    try {
      const formData = new FormData();
      uploadedImages.forEach((file, i) => formData.append(`image_${i}`, file));
      formData.append("imageCount", String(uploadedImages.length));
      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `오류 ${res.status}`);
      const { text = "" } = await res.json();
      setOcrRawText(text);
      setEditedOcrText(text);
    } catch (err) {
      alert(`OCR 오류:\n${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setIsOcrLoading(false);
    }
  };

  // ── 1→2단계 ─────────────────────────────────────────────────────────────
  const handleComplete = () => {
    if (!canComplete) return;
    setIsOcrComplete(true);
    setCurrentStep(2);
  };

  // ── 구조화 분석 ──────────────────────────────────────────────────────────
  const handleStructureAnalysis = async () => {
    if (!canStructure) return;
    setIsStructureLoading(true);
    setIsStructureComplete(false);
    try {
      const res = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editedOcrText }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `오류 ${res.status}`);
      const { results = [] }: { results: StructuredResult[] } = await res.json();
      setStructuredResults(results);
      setSelectedGroupIndex(results.length === 1 ? 0 : -1);
      setStructuredResult(results.length === 1 ? results[0] : null);
    } catch (err) {
      alert(`구조화 분석 오류:\n${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setIsStructureLoading(false);
    }
  };

  // ── 2→3단계 ─────────────────────────────────────────────────────────────
  const handleStructureComplete = () => {
    if (!canFinishStructure) return;
    setIsStructureComplete(true);
    setCurrentStep(3);
  };

  // ── 문항 분석 ────────────────────────────────────────────────────────────
  const handleAnalysis = async () => {
    if (!canAnalyze || !structuredResult) return;
    setIsAnalysisLoading(true);
    setIsAnalysisComplete(false);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structured: structuredResult }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `오류 ${res.status}`);
      const { result }: { result: AnalysisResult } = await res.json();
      setAnalysisResult(result);
    } catch (err) {
      alert(`문항 분석 오류:\n${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  // ── 3→4단계 ─────────────────────────────────────────────────────────────
  const handleAnalysisComplete = () => {
    if (!canFinishAnalysis) return;
    setIsAnalysisComplete(true);
    setCurrentStep(4);
  };

  // ── 문제 생성 ────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!canGenerate || !structuredResult || !analysisResult) return;
    setIsGenerationLoading(true);
    setIsGenerationComplete(false);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structured: structuredResult, analysis: analysisResult }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `오류 ${res.status}`);
      const { result }: { result: GenerationResult } = await res.json();
      setGenerationResult(result);
      setIsGenerationComplete(true);
    } catch (err) {
      alert(`문제 생성 오류:\n${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setIsGenerationLoading(false);
    }
  };

  const handleGenerationComplete = () => {
    if (!canFinishGeneration) return;
    setIsGenerationComplete(true);
  };

  // ── 저장 ─────────────────────────────────────────────────────────────────
  const handleSave = async (meta: {
    title: string; schoolName: string; grade: string;
    subjectArea: string; unitName: string; difficulty: string;
  }) => {
    const res = await fetch("/api/problems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meta,
        ocrRawText: ocrRawText,
        ocrEditedText: editedOcrText,
        structured: structuredResult,
        analysis: analysisResult,
        generation: generationResult,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "저장 실패");
    setSavedId(data.id);
    setShowSaveModal(false);
  };

  // ── 단계 클릭 ────────────────────────────────────────────────────────────
  const handleStepClick = (step: number) => {
    if (step === 1) setCurrentStep(1);
    else if (step === 2 && canGoToStep2) setCurrentStep(2);
    else if (step === 3 && canGoToStep3) setCurrentStep(3);
    else if (step === 4 && canGoToStep4) setCurrentStep(4);
  };

  function StepBadge({ step, label }: { step: number; label: string }) {
    const done = currentStep > step;
    const active = currentStep === step;
    const available =
      step === 1 ? true :
      step === 2 ? canGoToStep2 :
      step === 3 ? canGoToStep3 :
      step === 4 ? canGoToStep4 : false;

    return (
      <button
        onClick={() => handleStepClick(step)}
        disabled={!available && !active}
        className={`flex items-center gap-1.5 transition-opacity ${
          !available && !active ? "opacity-40 cursor-not-allowed" : active ? "opacity-100" : "opacity-60 hover:opacity-80"
        }`}
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
          active ? "bg-blue-600 text-white" : done ? "bg-green-500 text-white" : "bg-gray-300 text-gray-500"
        }`}>
          {done ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : step}
        </div>
        <span className={`text-sm font-medium ${active ? "text-blue-600" : done ? "text-green-600" : "text-gray-500"}`}>
          {label}
        </span>
      </button>
    );
  }

  // ── 렌더링 ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">국어 문제은행</h1>
            <p className="text-xs text-gray-500 -mt-0.5">OCR · 구조화 · 분석 · 문제 생성</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/pattern-remix"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              패턴 재구성
            </Link>
            <Link href="/problems"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              문제은행
            </Link>
            <AuthUserMenu />
            <StepBadge step={1} label="OCR" />
            <div className="w-6 h-px bg-gray-300" />
            <StepBadge step={2} label="구조화" />
            <div className="w-6 h-px bg-gray-300" />
            <StepBadge step={3} label="분석" />
            <div className="w-6 h-px bg-gray-300" />
            <StepBadge step={4} label="문제 생성" />
          </div>
        </div>
      </header>

      {/* 완료 배너 */}
      {isOcrComplete && currentStep === 1 && (
        <div className="bg-green-50 border-b border-green-200 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 text-green-700 text-sm font-medium">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            OCR 완료. 2단계로 이동하세요.
          </div>
        </div>
      )}
      {isStructureComplete && currentStep === 2 && (
        <div className="bg-green-50 border-b border-green-200 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 text-green-700 text-sm font-medium">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            구조화 완료. 3단계로 이동하세요.
          </div>
        </div>
      )}
      {isAnalysisComplete && currentStep === 3 && (
        <div className="bg-green-50 border-b border-green-200 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 text-green-700 text-sm font-medium">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            분석 완료. 4단계로 이동하세요.
          </div>
        </div>
      )}
      {isGenerationComplete && currentStep === 4 && (
        <div className="bg-green-50 border-b border-green-200 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 text-green-700 text-sm font-medium">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            문제 생성 완료.
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 flex flex-col gap-6 min-h-0">

        {/* 1단계 */}
        {currentStep === 1 && (
          <>
            <div className="flex gap-6 flex-1 min-h-0">
              <div className="w-[45%] flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col">
                <ImageUploader />
              </div>
              <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col">
                <OCREditor />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">
              <p className="text-sm text-gray-500">
                {uploadedImages.length === 0 ? "시험지 이미지를 업로드하고 OCR을 실행하세요."
                  : isOcrLoading ? "OCR 분석 중... (30초 이상 걸릴 수 있습니다)"
                  : editedOcrText ? "텍스트를 확인·수정한 후 수정 완료를 눌러주세요."
                  : `${uploadedImages.length}장 업로드됨. OCR을 실행하세요.`}
              </p>
              <div className="flex items-center gap-3">
                <button onClick={handleOcrRun} disabled={!canRunOcr}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${canRunOcr ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                  {isOcrLoading ? <><Spinner /> OCR 실행 중...</> : <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    OCR 실행
                  </>}
                </button>
                <button onClick={handleComplete} disabled={!canComplete}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${canComplete ? isOcrComplete ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200" : "bg-green-600 text-white hover:bg-green-700 shadow-sm" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isOcrComplete ? "완료됨 (2단계로 이동)" : "수정 완료"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* 2단계 */}
        {currentStep === 2 && (
          <>
            <div className="flex-1 min-h-0"><StructuredView /></div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">
              <p className="text-sm text-gray-500">
                {isStructureLoading ? "AI 분석 중... (20~40초 소요)"
                  : isStructureComplete ? "구조화 완료."
                  : structuredResult ? "결과를 확인·수정한 후 구조화 완료를 눌러주세요."
                  : structuredResults.length > 1 && selectedGroupIndex === -1 ? "오른쪽에서 분석할 지문 그룹을 선택하세요."
                  : "구조화 분석을 시작하세요."}
              </p>
              <div className="flex items-center gap-3">
                <button onClick={handleStructureAnalysis} disabled={!canStructure}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${canStructure ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                  {isStructureLoading ? <><Spinner /> 분석 중...</> : <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    구조화 분석
                  </>}
                </button>
                <button onClick={handleStructureComplete} disabled={!canFinishStructure}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${canFinishStructure ? isStructureComplete ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200" : "bg-green-600 text-white hover:bg-green-700 shadow-sm" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isStructureComplete ? "완료됨 (3단계로 이동)" : "구조화 완료"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* 3단계 */}
        {currentStep === 3 && (
          <>
            <div className="flex-1 min-h-0"><AnalysisView /></div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">
              <p className="text-sm text-gray-500">
                {isAnalysisLoading ? "AI 분석 중... (20~40초 소요)" : isAnalysisComplete ? "분석 완료."
                  : analysisResult ? "분석 결과를 확인하세요." : "문항 분석을 시작하세요."}
              </p>
              <div className="flex items-center gap-3">
                <button onClick={handleAnalysis} disabled={!canAnalyze}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${canAnalyze ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                  {isAnalysisLoading ? <><Spinner /> 분석 중...</> : <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    문항 분석
                  </>}
                </button>
                <button onClick={handleAnalysisComplete} disabled={!canFinishAnalysis}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${canFinishAnalysis ? isAnalysisComplete ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200" : "bg-green-600 text-white hover:bg-green-700 shadow-sm" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isAnalysisComplete ? "완료됨 (4단계로 이동)" : "분석 완료"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* 4단계 */}
        {currentStep === 4 && (
          <>
            <div className="flex-1 min-h-0"><GenerationView /></div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">
              <p className="text-sm text-gray-500">
                {isGenerationLoading ? "유사·변형 문제를 생성 중입니다... (30~60초 소요)"
                  : savedId ? "저장 완료! 문제은행에서 확인하세요."
                  : generationResult ? "생성된 문제를 확인하고 저장하세요."
                  : "문제 생성 버튼을 눌러 유사·변형 문제를 생성하세요."}
              </p>
              <div className="flex items-center gap-3">
                <button onClick={handleGenerate} disabled={!canGenerate}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${canGenerate ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                  {isGenerationLoading ? <><Spinner /> 생성 중...</> : <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    문제 생성
                  </>}
                </button>
                {/* 저장 버튼 */}
                {savedId ? (
                  <Link href={`/problems/${savedId}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    저장됨 — 상세 보기
                  </Link>
                ) : (
                  <button onClick={() => setShowSaveModal(true)} disabled={!generationResult && !structuredResult}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${(generationResult || structuredResult) ? "bg-green-600 text-white hover:bg-green-700 shadow-sm" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    문제은행에 저장
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* 저장 모달 */}
      {showSaveModal && (
        <SaveModal
          onSave={handleSave}
          onClose={() => setShowSaveModal(false)}
          defaultArea={structuredResult?.area ?? ""}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
