'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Job } from '@/types/jobs';

const DONE = ['completed', 'failed', 'cancelled'];

export function useJobRunner(initialJobId?: string) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jobRef = useRef<Job | null>(null);
  useEffect(() => { jobRef.current = job; }, [job]);

  const progress = useMemo(() => {
    if (!job) return 0;
    if (job.status === 'completed') return 100;
    if (job.total_chunks <= 0) return 0;
    return Math.round((job.completed_chunks / job.total_chunks) * 100);
  }, [job]);

  const fetchJob = useCallback(async (jobId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const json = await res.json();
      if (res.ok) { setJob(json.job); jobRef.current = json.job; setError(null); }
      else setError(json.error ?? 'job 조회 실패');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'job 조회 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelJob = useCallback(async () => {
    const cur = jobRef.current;
    if (!cur) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${cur.id}/cancel`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) { setJob(json.job); jobRef.current = json.job; setError(null); }
      else setError(json.error ?? 'cancel 실패');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'cancel 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  const retryJob = useCallback(async () => {
    const cur = jobRef.current;
    if (!cur) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${cur.id}/retry`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) { setJob(json.job); jobRef.current = json.job; setError(null); }
      else setError(json.error ?? 'retry 실패');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'retry 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    if (!initialJobId) return;
    fetchJob(initialJobId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJobId]);

  // 2-second polling while job is running
  useEffect(() => {
    if (!job?.id || DONE.includes(job.status)) return;
    const timer = setInterval(() => fetchJob(job.id), 2000);
    return () => clearInterval(timer);
  }, [job?.id, job?.status, fetchJob]);

  return { job, progress, loading, error, fetchJob, cancelJob, retryJob };
}
