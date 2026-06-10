import type { Job, JobType } from '@/types/jobs';
import { randomUUID } from 'crypto';

interface JobEntry {
  job: Job;
  abortController: AbortController;
}

const store = new Map<string, JobEntry>();

function now(): string {
  return new Date().toISOString();
}

export function createJob(
  type: JobType,
  payload: Record<string, unknown>,
  totalChunks: number,
): Job {
  const job: Job = {
    id: randomUUID(),
    user_id: '',
    type,
    status: 'pending',
    total_chunks: totalChunks,
    completed_chunks: 0,
    failed_chunks: 0,
    token_usage: 0,
    error_message: null,
    payload,
    result: null,
    created_at: now(),
    updated_at: now(),
  };
  store.set(job.id, { job, abortController: new AbortController() });
  return job;
}

export function getJob(id: string): Job | null {
  return store.get(id)?.job ?? null;
}

export function getAbortSignal(id: string): AbortSignal | null {
  return store.get(id)?.abortController.signal ?? null;
}

export function updateJob(id: string, partial: Partial<Job>): void {
  const entry = store.get(id);
  if (!entry) return;
  entry.job = { ...entry.job, ...partial, updated_at: now() };
}

export function cancelJob(id: string): void {
  const entry = store.get(id);
  if (!entry) return;
  entry.abortController.abort();
  entry.job = { ...entry.job, status: 'cancelled', updated_at: now() };
}

export function resetJob(id: string): void {
  const entry = store.get(id);
  if (!entry) return;
  entry.abortController = new AbortController();
  entry.job = {
    ...entry.job,
    status: 'running',
    completed_chunks: 0,
    failed_chunks: 0,
    error_message: null,
    updated_at: now(),
  };
}

export function listJobs(): Job[] {
  return Array.from(store.values())
    .map(e => e.job)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
