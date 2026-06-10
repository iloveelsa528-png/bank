"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import JobRunner from "@/components/JobRunner";
import ExamResultView from "@/components/pattern/ExamResultView";
import type { Job } from "@/types/jobs";

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function PatternRemixPage() {
  const [images, setImages]       = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [examJobId, setExamJobId] = useState<string | null>(null);
  const [completedJob, setCompletedJob] = useState<Job | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("examJobId");
    if (saved) setExamJobId(saved);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith("image/"));
    setImages(prev => [...prev, ...files].slice(0, 30));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    setImages(prev => [...prev, ...files].slice(0, 30));
  };

  const handleUpload = async () => {
    if (images.length === 0) return;
    setUploading(true);
    setUploadError("");
    setCompletedJob(null);
    try {
      const formData = new FormData();
      images.forEach((f, i) => formData.append(`image_${i}`, f));
      formData.append("imageCount", String(images.length));
      const res = await fetch("/api/uploads/exam", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "업로드 실패");
      localStorage.setItem("examJobId", data.jobId);
      setExamJobId(data.jobId);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem("examJobId");
    setExamJobId(null);
    setImages([]);
    setCompletedJob(null);
    setUploadError("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              홈
            </Link>
            <div>
              <h1 className="text-base font-bold text-gray-900">1단계 — 기출 시험지 넣기</h1>
              <p className="text-xs text-gray-400">시험지 사진 → AI가 문항 패턴 자동 분석</p>
            </div>
          </div>
          <Link
            href="/pattern-remix/library"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            저장된 패턴 목록
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-24">

        {/* 업로드 영역 (진행 중이 아닐 때) */}
        {!examJobId && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">

            {images.length === 0 ? (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => document.getElementById("exam-file-input")?.click()}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center gap-3 text-center hover:border-green-300 hover:bg-green-50/30 transition-colors cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">시험지 사진을 여기에 올려주세요</p>
                  <p className="text-xs text-gray-400 mt-1">클릭하거나 드래그 · JPG, PNG · 최대 30장</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700 mb-2">선택된 사진 {images.length}장</p>
                {images.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(f)}
                      alt={f.name}
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{f.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{i + 1}번째 페이지 · {fmtSize(f.size)}</p>
                    </div>
                    <button
                      onClick={() => setImages(p => p.filter((_, j) => j !== i))}
                      className="w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-xs hover:bg-red-200 transition-colors flex-shrink-0"
                    >×</button>
                  </div>
                ))}
                <button
                  onClick={() => document.getElementById("exam-file-input")?.click()}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 hover:border-green-300 hover:text-green-600 transition-colors"
                >
                  + 사진 추가 ({images.length}/30)
                </button>
              </div>
            )}

            <input id="exam-file-input" type="file" multiple accept="image/*" className="hidden" onChange={handleFileInput} />

            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">{uploadError}</div>
            )}

            <button
              onClick={handleUpload}
              disabled={images.length === 0 || uploading}
              className="w-full py-3.5 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-40 hover:bg-green-700 transition-colors shadow-sm"
            >
              {uploading ? "업로드 중…" : `AI 분석 시작하기 (${images.length}장)`}
            </button>

            {images.length === 0 && (
              <p className="text-xs text-gray-400 text-center">
                수능·모의고사·학교 내신 시험지 모두 가능합니다
              </p>
            )}
          </div>
        )}

        {/* 분석 진행 중 */}
        {examJobId && !completedJob && (
          <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">AI가 시험지를 분석하고 있습니다</p>
                <p className="text-xs text-gray-400 mt-0.5">글자 인식 → 지문 분리 → 패턴 추출 순으로 처리합니다 (1~3분)</p>
              </div>
            </div>
            <JobRunner
              jobId={examJobId}
              onComplete={(job) => setCompletedJob(job)}
            />
            <button onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-600 underline">
              취소하고 다시 시작
            </button>
          </div>
        )}

        {/* 분석 완료 결과 */}
        {completedJob?.result && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="text-sm font-bold text-green-800">분석 완료!</p>
                <p className="text-xs text-green-600">아래에서 패턴을 확인하고 저장하세요</p>
              </div>
            </div>
            <ExamResultView
              groups={(completedJob.result as { groups: Parameters<typeof ExamResultView>[0]["groups"] }).groups ?? []}
              jobId={completedJob.id}
              onSaved={() => {}}
            />
            <button onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-600 underline block">
              새 시험지 업로드하기
            </button>
          </div>
        )}

        {/* 실패 */}
        {examJobId && completedJob && completedJob.status === "failed" && !completedJob.result && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-semibold text-red-700">분석에 실패했습니다</p>
            {completedJob.error_message && (
              <p className="text-xs text-red-500">{completedJob.error_message}</p>
            )}
            <button onClick={handleReset} className="text-sm text-red-600 hover:text-red-800 font-medium">
              다시 시도하기
            </button>
          </div>
        )}

        {/* 다음 단계 안내 */}
        {completedJob?.result && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">다음 단계</p>
              <p className="text-xs text-gray-500 mt-0.5">2단계: 문제 만들 지문을 등록하세요</p>
            </div>
            <Link
              href="/source-passages"
              className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors flex-shrink-0"
            >
              지문 등록하기 →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
