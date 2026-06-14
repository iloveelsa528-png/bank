import type { JobChunkKind } from '@/types/jobs';

// ─── 추정용 구형 함수 (기존 호환성 유지) ──────────────────────────────────
const CHUNK_PRICE_TABLE: Record<JobChunkKind, { tokenEstimate: number; centEstimate: number }> = {
  mock:     { tokenEstimate: 10,  centEstimate: 0 },
  ocr:      { tokenEstimate: 30,  centEstimate: 1 },
  segment:  { tokenEstimate: 10,  centEstimate: 0 },
  analyze:  { tokenEstimate: 50,  centEstimate: 2 },
  generate: { tokenEstimate: 80,  centEstimate: 3 },
  finalize: { tokenEstimate: 1,   centEstimate: 0 },
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

// ─── 공식 단가 (USD per 1,000,000 tokens) ────────────────────────────────
// 이 표 한 곳만 고치면 calcCostUsd 전체에 반영됨.
export const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6':        { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5-20251001': { input: 1.00,  output: 5.00  },
};

// 마진 배율 (1.0 = 원가 그대로, 1.2 = 20% 마진)
export const MARGIN = 1.0;

/**
 * usage_logs의 (model, input_tokens, output_tokens)를 받아 USD 예상 비용 반환.
 * 알 수 없는 모델은 0을 반환하고 콘솔에 경고 출력.
 */
export function calcCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = MODEL_PRICES[model];
  if (!price) {
    console.warn(`[pricing] 알 수 없는 모델: "${model}" — 단가 0 처리. MODEL_PRICES에 추가 필요.`);
    return 0;
  }
  return ((inputTokens * price.input + outputTokens * price.output) / 1_000_000) * MARGIN;
}
