import { createJob } from '@/lib/jobs/store';
import { runExamPipeline } from '@/lib/processing/exam';
import { runPassagePipeline } from '@/lib/processing/passage';
import { runQuestionsPipeline } from '@/lib/processing/questions';
import { splitPassageIntoWindows } from '@/lib/ai/passage';
import type { GeneratePattern } from '@/lib/ai/generate';
import type { Job } from '@/types/jobs';

const GENERATE_BATCH = 3;

export function createExamOcrJob(localImagePaths: string[], uploadFolderId: string): Job {
  const total = localImagePaths.length + 2;
  const job = createJob(
    'exam_ocr_analyze',
    { imagePaths: localImagePaths, uploadFolderId },
    total,
  );
  runExamPipeline(job.id, localImagePaths).catch(err =>
    console.error('[exam pipeline error]', err),
  );
  return job;
}

export function createPassageAnalyzeJob(
  passageText: string,
  area: string,
  sourceType: string,
): Job {
  const windowCount = splitPassageIntoWindows(passageText).length;
  const job = createJob(
    'passage_analyze',
    { passageText, area, sourceType },
    windowCount,
  );
  runPassagePipeline(job.id, passageText, area, sourceType).catch(err =>
    console.error('[passage pipeline error]', err),
  );
  return job;
}

export function createQuestionGenerateJob(
  patterns: GeneratePattern[],
  passageText: string,
  passageTitle: string,
  passageArea: string,
  passageKeyPoints: string,
): Job {
  const batchCount = Math.ceil(patterns.length / GENERATE_BATCH);
  const job = createJob(
    'question_generate',
    { patterns, passageText, passageTitle, passageArea, passageKeyPoints },
    batchCount,
  );
  runQuestionsPipeline(
    job.id, patterns, passageText, passageTitle, passageArea, passageKeyPoints,
  ).catch(err => console.error('[questions pipeline error]', err));
  return job;
}
