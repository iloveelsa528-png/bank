import type { JobChunkKind } from '@/types/jobs';

const CHUNK_PRICE_TABLE: Record<JobChunkKind, { tokenEstimate: number; centEstimate: number }> = {
  mock: { tokenEstimate: 10, centEstimate: 0 },
  ocr: { tokenEstimate: 30, centEstimate: 1 },
  segment: { tokenEstimate: 10, centEstimate: 0 },
  analyze: { tokenEstimate: 50, centEstimate: 2 },
  generate: { tokenEstimate: 80, centEstimate: 3 },
  finalize: { tokenEstimate: 1, centEstimate: 0 },
};

export function estimateChunkCost(kind: JobChunkKind) {
  return CHUNK_PRICE_TABLE[kind] ?? { tokenEstimate: 10, centEstimate: 0 };
}

export function estimateJobCost(totalChunks: number, averageChunkKind: JobChunkKind = 'mock') {
  const chunkCost = estimateChunkCost(averageChunkKind);
  return {
    tokenEstimate: totalChunks * chunkCost.tokenEstimate,
    centEstimate: totalChunks * chunkCost.centEstimate,
  };
}
