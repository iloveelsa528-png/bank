import { runGenerateChunk } from '@/lib/ai/generate';
import type { GeneratePattern } from '@/lib/ai/generate';
import type { PatternBasedQuestion } from '@/types/pattern-remix';
import { updateJob, getJob, getAbortSignal } from '@/lib/jobs/store';
import { mergeModel } from '@/lib/jobs/usage';

const BATCH_SIZE = 3;

function checkAbort(jobId: string) {
  const signal = getAbortSignal(jobId);
  if (signal?.aborted) throw new Error('cancelled');
}

export async function runQuestionsPipeline(
  jobId: string,
  patterns: GeneratePattern[],
  passageText: string,
  passageTitle: string,
  passageArea: string,
  passageKeyPoints: string,
  passageAnalysisSummary?: string,
  passageCandidatePoints?: string,
  genreAdaptation?: boolean,
): Promise<void> {
  try {
    updateJob(jobId, { status: 'running' });

    const batches: GeneratePattern[][] = [];
    for (let i = 0; i < patterns.length; i += BATCH_SIZE) {
      batches.push(patterns.slice(i, i + BATCH_SIZE));
    }

    const batchResults: PatternBasedQuestion[][] = new Array(batches.length).fill(null);

    await Promise.all(
      batches.map(async (batch, batchIdx) => {
        checkAbort(jobId);
        const startNumber = batchIdx * BATCH_SIZE + 1;
        const result = await runGenerateChunk(
          batch, passageText, passageTitle, passageArea, passageKeyPoints, startNumber,
          passageAnalysisSummary, passageCandidatePoints, genreAdaptation,
        );
        batchResults[batchIdx] = result.output.questions;
        const cur = getJob(jobId);
        updateJob(jobId, {
          completed_chunks: (cur?.completed_chunks ?? 0) + 1,
          token_usage: (cur?.token_usage ?? 0) + result.usage.input_tokens + result.usage.output_tokens,
          usage_by_model: mergeModel(cur?.usage_by_model, result.usage.model, result.usage.input_tokens, result.usage.output_tokens),
        });
      })
    );

    const allQuestions = batchResults
      .flat()
      .map((q, i) => ({ ...q, question_number: i + 1 }));

    updateJob(jobId, {
      status: 'completed',
      result: { questions: allQuestions },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'cancelled') return;
    updateJob(jobId, { status: 'failed', error_message: msg });
  }
}
