import { runPassageAnalyzeChunk, splitPassageIntoWindows, mergePassageAnalyses } from '@/lib/ai/passage';
import { updateJob, getJob, getAbortSignal } from '@/lib/jobs/store';
import { mergeModel } from '@/lib/jobs/usage';

function checkAbort(jobId: string) {
  const signal = getAbortSignal(jobId);
  if (signal?.aborted) throw new Error('cancelled');
}

export async function runPassagePipeline(
  jobId: string,
  passageText: string,
  area: string,
  sourceType: string,
): Promise<void> {
  try {
    updateJob(jobId, { status: 'running' });

    const windows = splitPassageIntoWindows(passageText);
    const results = [];

    for (const window of windows) {
      checkAbort(jobId);
      const result = await runPassageAnalyzeChunk(window, area, sourceType);
      results.push(result.output);
      const cur = getJob(jobId);
      updateJob(jobId, {
        completed_chunks: (cur?.completed_chunks ?? 0) + 1,
        token_usage: (cur?.token_usage ?? 0) + result.usage.input_tokens + result.usage.output_tokens,
        usage_by_model: mergeModel(cur?.usage_by_model, result.usage.model, result.usage.input_tokens, result.usage.output_tokens),
      });
    }

    const merged = mergePassageAnalyses(results);
    updateJob(jobId, {
      status: 'completed',
      result: merged as unknown as Record<string, unknown>,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'cancelled') return;
    updateJob(jobId, { status: 'failed', error_message: msg });
  }
}
