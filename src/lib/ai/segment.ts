import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';

const client = new Anthropic();

// AI는 각 그룹의 시작 위치만 반환 → 실제 텍스트는 원문에서 직접 슬라이싱
const SegmentSchema = {
  type: 'object',
  properties: {
    groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label:      { type: 'string', description: '[11~14] 형태 라벨. 없으면 빈 문자열' },
          startsWith: { type: 'string', description: '이 그룹이 시작하는 텍스트의 첫 30~50자를 원문에서 정확히 복사' },
        },
        required: ['label', 'startsWith'],
        additionalProperties: false,
      },
    },
  },
  required: ['groups'],
  additionalProperties: false,
} as const;

interface RawSegmentGroup {
  label: string;
  startsWith: string;
}

export interface SegmentGroup {
  label: string;
  text: string;
}

export interface SegmentResult {
  groups: SegmentGroup[];
  usage: { model: string; input_tokens: number; output_tokens: number };
}

const SEGMENT_MAX_GROUPS = 12;

export async function runSegmentChunk(allOcrText: string): Promise<SegmentResult> {
  try {
    const response = await client.messages.parse({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: '당신은 국어 시험지 OCR 텍스트를 지문 그룹으로 분할하는 전문가입니다.',
      messages: [{
        role: 'user',
        content: `다음 국어 시험지 OCR 텍스트를 지문 그룹으로 분할하세요.

규칙:
- 각 그룹은 "[11~14] 다음 글을 읽고..." 형태의 지시문으로 시작합니다
- 지시문이 없는 독립 문항(문법·어휘 등)도 별도 그룹으로 처리하세요
- label: "[11~14]" 형태 (없으면 빈 문자열)
- startsWith: 이 그룹이 시작하는 텍스트의 첫 30~50자를 **원문 그대로** 복사
  (절대 바꾸거나 요약하지 말 것 — 원문 검색에 사용됩니다)

[OCR 텍스트]
${allOcrText}`,
      }],
      output_config: {
        format: jsonSchemaOutputFormat(SegmentSchema as Parameters<typeof jsonSchemaOutputFormat>[0]),
      },
    });

    const parsed = response.parsed_output as { groups: RawSegmentGroup[] } | null;
    const rawGroups = parsed?.groups?.slice(0, SEGMENT_MAX_GROUPS) ?? [];

    const usage = {
      model: 'claude-haiku-4-5-20251001',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    };

    if (rawGroups.length === 0) {
      return { groups: [{ label: '', text: allOcrText }], usage };
    }

    // startsWith 마커로 원문 슬라이싱 → 각 그룹의 실제 텍스트 추출
    const groups: SegmentGroup[] = rawGroups.map((g, idx, arr) => {
      const start = allOcrText.indexOf(g.startsWith);
      const nextIdx = arr[idx + 1] ? allOcrText.indexOf(arr[idx + 1].startsWith) : -1;
      const end = nextIdx > start ? nextIdx : allOcrText.length;
      const text = start >= 0 ? allOcrText.slice(start, end).trim() : '';
      return { label: g.label, text: text || allOcrText };
    });

    const validGroups = groups.filter(g => g.text.length > 20);
    return {
      groups: validGroups.length > 0 ? validGroups : [{ label: '', text: allOcrText }],
      usage,
    };
  } catch (err) {
    console.warn('[segment] parse failed, falling back to single group:', err instanceof Error ? err.message : err);
    return {
      groups: [{ label: '', text: allOcrText }],
      usage: { model: 'claude-haiku-4-5-20251001', input_tokens: 0, output_tokens: 0 },
    };
  }
}
