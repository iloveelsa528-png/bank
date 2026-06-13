import { createJob } from '@/lib/jobs/store';
import { runExamPipeline } from '@/lib/processing/exam';
import { runExamTextPipeline } from '@/lib/processing/exam-text';
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

// 텍스트 레이어가 있는 PDF용 — OCR 없이 바로 segment → analyze
export function createExamTextJob(extractedText: string, uploadFolderId: string): Job {
  // total_chunks = OCR 대체(1) + segment(1) + analyze(미정, 후에 갱신됨)
  const job = createJob(
    'exam_ocr_analyze',
    { uploadFolderId, sourceType: 'text_pdf' },
    3,
  );
  runExamTextPipeline(job.id, extractedText).catch(err =>
    console.error('[exam text pipeline error]', err),
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
  passageAnalysisSummary?: string,
  passageCandidatePoints?: string,
  genreAdaptation?: boolean,
): Job {
  const batchCount = Math.ceil(patterns.length / GENERATE_BATCH);
  const job = createJob(
    'question_generate',
    { patterns, passageText, passageTitle, passageArea, passageKeyPoints },
    batchCount,
  );
  runQuestionsPipeline(
    job.id, patterns, passageText, passageTitle, passageArea, passageKeyPoints,
    passageAnalysisSummary, passageCandidatePoints, genreAdaptation,
  ).catch(err => console.error('[questions pipeline error]', err));
  return job;
}
