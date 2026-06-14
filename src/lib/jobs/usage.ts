import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import type { Job } from '@/types/jobs';

export function mergeModel(
  existing: Record<string, { input: number; output: number }> | null | undefined,
  model: string,
  input: number,
  output: number,
): Record<string, { input: number; output: number }> {
  const base = existing ?? {};
  const prev = base[model] ?? { input: 0, output: 0 };
  return { ...base, [model]: { input: prev.input + input, output: prev.output + output } };
}

export async function recordJobUsage(job: Job): Promise<void> {
  // 사용자 미확인 또는 토큰 데이터 없으면 스킵
  if (!job.user_id || !job.usage_by_model) return;

  const entries = Object.entries(job.usage_by_model).filter(
    ([, u]) => u.input + u.output > 0,
  );
  if (entries.length === 0) return;

  try {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO usage_logs
        (id, user_id, job_id, job_type, model, input_tokens, output_tokens)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const [model, usage] of entries) {
      stmt.run(
        randomUUID(),
        job.user_id,
        job.id,
        job.type,
        model,
        usage.input,
        usage.output,
      );
    }
  } catch (err) {
    console.error('[recordJobUsage] DB 저장 실패 (작업 결과에 영향 없음):', err);
  }
}
