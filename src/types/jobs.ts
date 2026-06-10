export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type JobChunkStatus = 'pending' | 'running' | 'completed' | 'retrying' | 'failed';
export type JobType = 'mock' | 'exam_ocr_analyze' | 'passage_analyze' | 'question_generate';
export type JobChunkKind = 'mock' | 'ocr' | 'segment' | 'analyze' | 'generate' | 'finalize';

export interface JobChunk {
  id: string;
  job_id: string;
  kind: JobChunkKind;
  status: JobChunkStatus;
  attempts: number;
  max_attempts: number;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  output_error: string | null;
  position: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  type: JobType;
  status: JobStatus;
  total_chunks: number;
  completed_chunks: number;
  failed_chunks: number;
  token_usage: number;
  error_message: string | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface JobWithChunks extends Job {
  chunks: JobChunk[];
}

export interface JobCreateRequest {
  type?: JobType;
  payload?: Record<string, unknown>;
  chunkCount?: number;
}

export interface JobListResponse {
  jobs: Job[];
}

export interface JobCreateResponse {
  job: Job;
}

export interface JobTickResponse {
  job: Job;
  chunk?: JobChunk | null;
  message?: string;
}
