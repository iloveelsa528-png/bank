import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import type { CandidateQuestionPoint } from '@/types/passages';

const client = new Anthropic();

const AnalysisSchema = {
  type: 'object',
  properties: {
    analysis_summary: { type: 'string', description: '이 텍스트 부분의 핵심 내용 요약 (200자 내외)' },
    key_points: { type: 'string', description: '핵심 논지·주제·내용을 3~5문장으로 정리' },
    candidate_question_points: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          element: { type: 'string', description: '출제 가능 요소명' },
          description: { type: 'string', description: '출제 가능 이유 설명' },
          question_type: { type: 'string', description: '내용이해, 추론, 표현분석, 어휘문법, 비판적사고, 적용 중 하나' },
        },
        required: ['element', 'description', 'question_type'],
        additionalProperties: false,
      },
    },
  },
  required: ['analysis_summary', 'key_points', 'candidate_question_points'],
  additionalProperties: false,
} as const;

export interface PassageAnalysisResult {
  analysis_summary: string;
  key_points: string;
  candidate_question_points: CandidateQuestionPoint[];
}

export async function runPassageAnalyzeChunk(
  windowText: string,
  area: string = '',
  sourceType: string = '',
): Promise<{ output: PassageAnalysisResult; usage: { model: string; input_tokens: number; output_tokens: number } }> {
  const response = await client.messages.parse({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: `당신은 국어 교육 전문가로, 지문을 분석하여 내신 대비 문제 출제 가능 요소를 파악합니다. 영역(${area || '국어'})과 출처 유형(${sourceType || '일반'})을 고려해 분석하세요.`,
    messages: [{
      role: 'user',
      content: `다음 지문을 분석하여 내신 대비 출제 가능 요소를 추출하세요.

[지문]
${windowText}

분석 항목:
1. analysis_summary: 핵심 내용을 200자 내외로 요약
2. key_points: 주제·논지·핵심 내용을 3~5문장으로 정리
3. candidate_question_points: 출제 가능 요소 5~8개 (각 요소마다 출제 이유와 예상 문항 유형 포함)`,
    }],
    output_config: {
      format: jsonSchemaOutputFormat(AnalysisSchema as Parameters<typeof jsonSchemaOutputFormat>[0]),
    },
  });

  const parsed = response.parsed_output as PassageAnalysisResult | null;
  if (!parsed) throw new Error('지문 분석 결과를 생성하지 못했습니다.');

  return {
    output: parsed,
    usage: { model: 'claude-sonnet-4-6', input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
  };
}

export function mergePassageAnalyses(windows: PassageAnalysisResult[]): PassageAnalysisResult {
  if (windows.length === 0) return { analysis_summary: '', key_points: '', candidate_question_points: [] };
  if (windows.length === 1) return windows[0];

  return {
    analysis_summary: windows.map(w => w.analysis_summary).filter(Boolean).join(' '),
    key_points: windows.map(w => w.key_points).filter(Boolean).join('\n\n'),
    candidate_question_points: windows.flatMap(w => w.candidate_question_points ?? []),
  };
}

export function splitPassageIntoWindows(text: string, maxChars = 3000): string[] {
  if (text.length <= maxChars) return [text];

  const windows: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChars;
    if (end < text.length) {
      const paraBreak = text.lastIndexOf('\n\n', end);
      if (paraBreak > start + maxChars / 2) {
        end = paraBreak + 2;
      } else {
        const sentenceBreak = text.lastIndexOf('. ', end);
        if (sentenceBreak > start + maxChars / 2) end = sentenceBreak + 2;
      }
    } else {
      end = text.length;
    }
    const window = text.slice(start, end).trim();
    if (window) windows.push(window);
    start = end;
  }

  return windows;
}
