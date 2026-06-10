import { runOcrChunk } from '@/lib/ai/ocr';
import { runSegmentChunk } from '@/lib/ai/segment';
import { runAnalyzeChunk } from '@/lib/ai/analyze';
import { updateJob, getAbortSignal } from '@/lib/jobs/store';

function checkAbort(jobId: string) {
  const signal = getAbortSignal(jobId);
  if (signal?.aborted) throw new Error('cancelled');
}

function addTokens(jobId: string, input: number, output: number) {
  // 누적 토큰을 job에 반영하려면 현재 값을 먼저 읽어야 하므로
  // store에서 getJob을 쓰되, 순환 참조를 피하기 위해 import는 store에서만
  const { getJob } = require('@/lib/jobs/store') as typeof import('@/lib/jobs/store');
  const job = getJob(jobId);
  if (!job) return;
  updateJob(jobId, { token_usage: job.token_usage + input + output });
}

export async function runExamPipeline(jobId: string, localImagePaths: string[]): Promise<void> {
  try {
    updateJob(jobId, { status: 'running' });

    // Phase 1: 병렬 OCR
    const ocrTexts: string[] = new Array(localImagePaths.length).fill('');
    await Promise.all(
      localImagePaths.map(async (imgPath, idx) => {
        checkAbort(jobId);
        const result = await runOcrChunk(imgPath);
        ocrTexts[idx] = result.output.text;
        addTokens(jobId, result.usage.input_tokens, result.usage.output_tokens);
        const { getJob } = require('@/lib/jobs/store') as typeof import('@/lib/jobs/store');
        const cur = getJob(jobId);
        updateJob(jobId, { completed_chunks: (cur?.completed_chunks ?? 0) + 1 });
      })
    );

    checkAbort(jobId);
    const allOcrText = ocrTexts.filter(Boolean).join('\n\n');

    // Phase 2: Segment
    const segResult = await runSegmentChunk(allOcrText);
    addTokens(jobId, segResult.usage.input_tokens, segResult.usage.output_tokens);
    const { getJob } = require('@/lib/jobs/store') as typeof import('@/lib/jobs/store');
    const afterSeg = getJob(jobId);
    const newTotal = (afterSeg?.total_chunks ?? 0) + segResult.groups.length;
    updateJob(jobId, {
      completed_chunks: (afterSeg?.completed_chunks ?? 0) + 1,
      total_chunks: newTotal,
    });

    checkAbort(jobId);

    // Phase 3: 병렬 Analyze
    const analyzeResults: Record<string, unknown>[] = new Array(segResult.groups.length).fill(null);
    await Promise.all(
      segResult.groups.map(async (group, idx) => {
        checkAbort(jobId);
        const result = await runAnalyzeChunk(group.text);
        analyzeResults[idx] = result.output;
        addTokens(jobId, result.usage.input_tokens, result.usage.output_tokens);
        const cur2 = getJob(jobId);
        updateJob(jobId, { completed_chunks: (cur2?.completed_chunks ?? 0) + 1 });
      })
    );

    // Phase 4: Finalize — align completed_chunks with total_chunks
    const finalJob = getJob(jobId);
    updateJob(jobId, {
      status: 'completed',
      completed_chunks: finalJob?.total_chunks ?? 0,
      result: { groups: analyzeResults, ocrRawText: allOcrText },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'cancelled') return;
    updateJob(jobId, { status: 'failed', error_message: msg });
  }
}
