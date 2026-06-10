'use client';

import { useEffect, useRef } from 'react';
import type { Job } from '@/types/jobs';
import { useJobRunner } from '@/hooks/useJobRunner';

const KIND_LABEL: Record<string, string> = {
  ocr: '이미지 읽는 중',
  segment: '지문 구분 중',
  analyze: '패턴 분석 중',
  generate: '문제 생성 중',
  finalize: '정리 중',
  mock: '처리 중',
};

const STATUS_LABEL: Record<string, string> = {
  pending: '대기 중',
  running: '진행 중',
  completed: '완료',
  failed: '실패',
  cancelled: '취소됨',
};

interface JobRunnerProps {
  jobId?: string;
  onComplete?: (job: Job) => void;
}

export default function JobRunner({ jobId, onComplete }: JobRunnerProps = {}) {
  const { job, progress, loading, error, cancelJob, retryJob } = useJobRunner(jobId);
  const notifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (job?.status === 'completed' && onComplete && notifiedRef.current !== job.id) {
      notifiedRef.current = job.id;
      onComplete(job);
    }
  }, [job, onComplete]);

  // 진행 중인 청크 종류 추정 (running 상태의 마지막 청크)
  const currentKind = job?.status === 'running' ? 'running' : undefined;
  void currentKind;

  if (jobId && !job && loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
        <span className="text-sm text-gray-500">job 불러오는 중…</span>
      </div>
    );
  }

  if (!jobId) {
    // 개발용 mock 모드
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">테스트 Job</h2>
        {job && <JobProgress job={job} progress={progress} loading={loading} onCancel={cancelJob} onRetry={retryJob} />}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="space-y-2">
      <JobProgress job={job} progress={progress} loading={loading} onCancel={cancelJob} onRetry={() => { retryJob(); retryJob(); }} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function JobProgress({
  job, progress, loading, onCancel, onRetry,
}: {
  job: Job;
  progress: number;
  loading: boolean;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const isActive = ['pending', 'running'].includes(job.status);
  const isFailed = job.status === 'failed';
  const isDone = job.status === 'completed';

  return (
    <div className="space-y-2">
      {/* 진행률 바 */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isFailed ? 'bg-red-400' : isDone ? 'bg-green-500' : 'bg-purple-500'
          }`}
          style={{ width: `${isDone ? 100 : progress}%` }}
        />
      </div>

      {/* 상태 텍스트 */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {isActive && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              {STATUS_LABEL[job.status] ?? job.status} · {job.completed_chunks}/{job.total_chunks} 단계
            </span>
          )}
          {isDone && (
            <span className="text-green-600 font-medium">완료 · {job.total_chunks}단계</span>
          )}
          {isFailed && (
            <span className="text-red-600">실패 ({job.failed_chunks}개 청크) — {job.error_message ?? ''}</span>
          )}
          {job.status === 'cancelled' && <span>취소됨</span>}
        </span>
        <span>{isDone ? '100' : progress}%</span>
      </div>

      {/* 토큰 사용량 */}
      {job.token_usage > 0 && (
        <p className="text-xs text-gray-400">토큰 {job.token_usage.toLocaleString()}</p>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        {isActive && (
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-red-500 transition disabled:opacity-40"
          >
            취소
          </button>
        )}
        {isFailed && job.failed_chunks > 0 && (
          <button
            onClick={onRetry}
            disabled={loading}
            className="text-xs text-purple-600 hover:text-purple-800 font-medium transition disabled:opacity-40"
          >
            실패 청크 재시도
          </button>
        )}
      </div>
    </div>
  );
}

export { KIND_LABEL, STATUS_LABEL };
