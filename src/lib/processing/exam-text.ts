// 텍스트 레이어가 있는 PDF용 파이프라인 — OCR 단계를 생략하고 직접 segment → analyze
import { runSegmentChunk } from '@/lib/ai/segment';
import { runAnalyzeChunk } from '@/lib/ai/analyze';
import { updateJob, getAbortSignal, getJob } from '@/lib/jobs/store';
import { mergeModel } from '@/lib/jobs/usage';

function checkAbort(jobId: string) {
  const signal = getAbortSignal(jobId);
  if (signal?.aborted) throw new Error('cancelled');
}

export async function runExamTextPipeline(jobId: string, extractedText: string): Promise<void> {
  try {
    updateJob(jobId, { status: 'running' });

    // Phase 1 (OCR) 대신: 이미 텍스트가 있으므로 completed_chunks만 1 증가
    checkAbort(jobId);
    const afterOcr = getJob(jobId);
    updateJob(jobId, { completed_chunks: (afterOcr?.completed_chunks ?? 0) + 1 });

    // Phase 2: Segment
    checkAbort(jobId);
    const segResult = await runSegmentChunk(extractedText);
    const afterSeg = getJob(jobId);
    const newTotal = (afterSeg?.total_chunks ?? 0) + segResult.groups.length;
    updateJob(jobId, {
      completed_chunks: (afterSeg?.completed_chunks ?? 0) + 1,
      total_chunks: newTotal,
      token_usage: (afterSeg?.token_usage ?? 0) + segResult.usage.input_tokens + segResult.usage.output_tokens,
      usage_by_model: mergeModel(afterSeg?.usage_by_model, segResult.usage.model, segResult.usage.input_tokens, segResult.usage.output_tokens),
    });

    // Phase 3: 병렬 Analyze
    checkAbort(jobId);
    const analyzeResults: Record<string, unknown>[] = new Array(segResult.groups.length).fill(null);
    await Promise.all(
      segResult.groups.map(async (group, idx) => {
        checkAbort(jobId);
        const result = await runAnalyzeChunk(group.text);
        analyzeResults[idx] = result.output;
        const cur = getJob(jobId);
        updateJob(jobId, {
          completed_chunks: (cur?.completed_chunks ?? 0) + 1,
          token_usage: (cur?.token_usage ?? 0) + result.usage.input_tokens + result.usage.output_tokens,
          usage_by_model: mergeModel(cur?.usage_by_model, result.usage.model, result.usage.input_tokens, result.usage.output_tokens),
        });
      }),
    );

    // Phase 4: Finalize
    const finalJob = getJob(jobId);
    updateJob(jobId, {
      status: 'completed',
      completed_chunks: finalJob?.total_chunks ?? 0,
      result: {
        groups: analyzeResults,
        ocrRawText: extractedText,
        segmentFailed: segResult.segmentFailed,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'cancelled') return;
    updateJob(jobId, { status: 'failed', error_message: msg });
  }
}
