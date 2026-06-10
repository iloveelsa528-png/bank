"use client";

import { useState } from "react";
import Link from "next/link";
import JobRunner from "@/components/JobRunner";
import ExamResultView from "@/components/pattern/ExamResultView";
import type { Job } from "@/types/jobs";

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function FileCard({ file, index, onRemove }: { file: File; index: number; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={URL.createObjectURL(file)}
        alt={file.name}
        className="w-14 h-14 object-cover rounded-lg border border-gray-200 flex-shrink-0"
      />
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-xs font-semibold text-gray-800 truncate">{file.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">페이지 {index + 1} · {fmtSize(file.size)}</p>
      </div>
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 w-5 h-5 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-xs hover:bg-red-200 transition-colors"
      >×</button>
    </div>
  );
}

export default function PatternRemixPage() {
  const [images, setImages]         = useState<File[]>([]);
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [examJobId, setExamJobId]   = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("examJobId");
  });
  const [completedJob, setCompletedJob] = useState<Job | null>(null);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith("image/"));
    setImages(prev => [...prev, ...files].slice(0, 10));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    setImages(prev => [...prev, ...files].slice(0, 10));
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
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            홈
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">기출문제 패턴 분석</h1>
            <p className="text-xs text-gray-500 -mt-0.5">시험지 업로드 → OCR → 패턴 추출 → 저장</p>
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
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* ── 1단계: 이미지 선택 + 업로드 (examJobId 없을 때만) ── */}
        {!examJobId && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-800">시험지 이미지 업로드</h2>

            {images.length === 0 ? (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => document.getElementById("exam-file-input")?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center gap-2 text-center hover:border-violet-300 hover:bg-violet-50/30 transition-colors cursor-pointer"
              >
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-sm text-gray-500">시험지 이미지를 드래그하거나 클릭하세요</p>
                <p className="text-xs text-gray-400">JPG, PNG · 최대 10장</p>
              </div>
            ) : (
              <div className="space-y-2">
                {images.map((f, i) => (
                  <FileCard
                    key={i}
                    file={f}
                    index={i}
                    onRemove={() => setImages(p => p.filter((_, j) => j !== i))}
                  />
                ))}
                <button
                  onClick={() => document.getElementById("exam-file-input")?.click()}
                  className="w-full py-2 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 hover:border-violet-300 hover:text-violet-500 transition-colors"
                >
                  + 이미지 추가 ({images.length}/10)
                </button>
              </div>
            )}

            <input id="exam-file-input" type="file" multiple accept="image/*" className="hidden" onChange={handleFileInput} />

            {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}

            <button
              onClick={handleUpload}
              disabled={images.length === 0 || uploading}
              className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-40 hover:bg-violet-700 transition-colors shadow-sm"
            >
              {uploading ? "업로드 중…" : `업로드 & 분석 시작 (${images.length}장)`}
            </button>
          </div>
        )}

        {/* ── 2단계: Job 진행 ── */}
        {examJobId && !completedJob && (
          <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-bold text-violet-800">분석 진행 중</h2>
            <p className="text-xs text-violet-500">OCR → 지문 분할 → 패턴 추출 순으로 자동 처리됩니다</p>
            <JobRunner
              jobId={examJobId}
              onComplete={(job) => setCompletedJob(job)}
            />
            <button onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-600 underline">
              취소 · 새로 시작
            </button>
          </div>
        )}

        {/* ── 3단계: 결과 확인 + 저장 ── */}
        {completedJob?.result && (
          <div className="space-y-3">
            <ExamResultView
              groups={(completedJob.result as { groups: Parameters<typeof ExamResultView>[0]["groups"] }).groups ?? []}
              jobId={completedJob.id}
              onSaved={() => {}}
            />
            <button onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-600 underline block">
              새 시험지 업로드
            </button>
          </div>
        )}

        {/* ── 실패 상태 ── */}
        {examJobId && completedJob && completedJob.status === "failed" && !completedJob.result && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-2">
            <p className="text-sm font-semibold text-red-700">분석 실패</p>
            {completedJob.error_message && (
              <p className="text-xs text-red-600">{completedJob.error_message}</p>
            )}
            <button onClick={handleReset} className="text-xs text-red-500 hover:text-red-700 underline">
              다시 시도
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
