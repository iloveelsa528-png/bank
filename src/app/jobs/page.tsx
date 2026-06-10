"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Job } from "@/types/jobs";

const TYPE_LABEL: Record<string, string> = {
  exam_ocr_analyze: "기출 분석",
  passage_analyze: "지문 분석",
  question_generate: "문제 생성",
  mock: "테스트",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "대기 중",
  running: "진행 중",
  completed: "완료",
  failed: "실패",
  cancelled: "취소됨",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-400",
};

const RESUME_MAP: Record<string, { path: string; lsKey: string } | null> = {
  exam_ocr_analyze: { path: "/pattern-remix", lsKey: "examJobId" },
  question_generate: { path: "/pattern-remix/generate", lsKey: "generateJobId" },
  passage_analyze: null,
  mock: null,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function JobRow({ job, onRetry, onCancel }: {
  job: Job;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const progress = job.total_chunks > 0
    ? Math.round((job.completed_chunks / job.total_chunks) * 100)
    : 0;
  const isActive = ["pending", "running"].includes(job.status);
  const resume = RESUME_MAP[job.type] ?? null;

  function handleResume() {
    if (!resume) return;
    localStorage.setItem(resume.lsKey, job.id);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-800">{TYPE_LABEL[job.type] ?? job.type}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[job.status] ?? "bg-gray-100 text-gray-600"}`}>
              {STATUS_LABEL[job.status] ?? job.status}
            </span>
            {isActive && (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(job.created_at)}</p>
        </div>
        {/* 토큰 */}
        {job.token_usage > 0 && (
          <span className="text-xs text-gray-400 shrink-0">
            {job.token_usage.toLocaleString()} 토큰
          </span>
        )}
      </div>

      {/* 진행률 */}
      {job.total_chunks > 0 && (
        <div className="space-y-1">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                job.status === "failed" ? "bg-red-400"
                : job.status === "completed" ? "bg-green-500"
                : "bg-blue-400"
              }`}
              style={{ width: `${job.status === "completed" ? 100 : progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">
            {job.completed_chunks}/{job.total_chunks} 단계
            {job.failed_chunks > 0 && (
              <span className="text-red-500 ml-1">· 실패 {job.failed_chunks}개</span>
            )}
          </p>
        </div>
      )}

      {/* 에러 메시지 */}
      {job.error_message && (
        <p className="text-xs text-red-500 bg-red-50 rounded px-2 py-1">{job.error_message}</p>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2 flex-wrap">
        {isActive && resume && (
          <Link
            href={resume.path}
            onClick={handleResume}
            className="text-xs px-3 py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition"
          >
            재개하기
          </Link>
        )}
        {job.status === "failed" && job.failed_chunks > 0 && (
          <button
            onClick={() => onRetry(job.id)}
            className="text-xs px-3 py-1.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium transition"
          >
            실패 청크 재시도
          </button>
        )}
        {isActive && (
          <button
            onClick={() => onCancel(job.id)}
            className="text-xs px-3 py-1.5 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 transition"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadJobs() {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "불러오기 실패");
      setJobs(data.jobs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadJobs(); }, []);

  async function handleRetry(jobId: string) {
    await fetch(`/api/jobs/${jobId}/retry`, { method: "POST" });
    loadJobs();
  }

  async function handleCancel(jobId: string) {
    await fetch(`/api/jobs/${jobId}/cancel`, { method: "POST" });
    loadJobs();
  }

  const active = jobs.filter(j => ["pending", "running"].includes(j.status));
  const done = jobs.filter(j => !["pending", "running"].includes(j.status));

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900">AI 작업 내역</h1>
        <button
          onClick={() => { setLoading(true); loadJobs(); }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          새로고침
        </button>
      </header>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">AI 작업 내역이 없습니다</p>
            <Link href="/pattern-remix" className="text-purple-600 hover:underline text-xs mt-2 block">
              기출 분석 시작하기
            </Link>
          </div>
        )}

        {active.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">진행 중 ({active.length})</p>
            {active.map(job => (
              <JobRow key={job.id} job={job} onRetry={handleRetry} onCancel={handleCancel} />
            ))}
          </div>
        )}

        {done.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
              완료/실패/취소 ({done.length})
            </p>
            {done.map(job => (
              <JobRow key={job.id} job={job} onRetry={handleRetry} onCancel={handleCancel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
