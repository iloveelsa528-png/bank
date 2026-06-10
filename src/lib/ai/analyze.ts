import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';

const client = new Anthropic();

// 기존 /api/patterns/analyze-all 와 동일한 스키마·프롬프트를 그룹 1개 단위로 재사용
const GroupSchema = {
  type: 'object',
  properties: {
    passageGroupLabel: { type: 'string', description: '[11~14] 형태. 없으면 빈 문자열' },
    area:              { type: 'string', description: '문학, 독서, 문법, 화작, 기타 중 하나' },
    passageTitle:      { type: 'string', description: '작품명. 없으면 빈 문자열' },
    passageAuthor:     { type: 'string', description: '작가/출처. 없으면 빈 문자열' },
    passageContent:    { type: 'string', description: '지문 본문만 (문제·선택지 제외). 없으면 빈 문자열' },
    sharedBoxContent:  { type: 'string', description: '공통 [보기]. 없으면 빈 문자열' },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          questionNumber: { type: 'number' },
          questionText:   { type: 'string' },
          boxText:        { type: 'string', description: '이 문항에만 붙은 보기. 없으면 빈 문자열' },
          choices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                number: { type: 'number' },
                text:   { type: 'string' },
              },
              required: ['number', 'text'],
              additionalProperties: false,
            },
          },
        },
        required: ['questionNumber', 'questionText', 'boxText', 'choices'],
        additionalProperties: false,
      },
    },
    patterns: {
      type: 'array',
      description: '각 문항의 출제 패턴. questions 배열과 순서/개수 일치',
      items: {
        type: 'object',
        properties: {
          question_number:      { type: 'number' },
          question_type:        { type: 'string', description: '내용이해, 추론, 비판적사고, 표현분석, 어휘문법, 적용, 기타 중 하나' },
          prompt_style:         { type: 'string' },
          choice_style:         { type: 'string' },
          answer_basis_type:    { type: 'string' },
          wrong_choice_pattern: { type: 'string' },
          difficulty:           { type: 'string', description: '기본, 응용, 고난도 중 하나' },
          intent:               { type: 'string' },
          uses_reference_box:   { type: 'boolean' },
          pattern_summary:      { type: 'string', description: '새 지문 적용 시 참고할 패턴 요약 한 문장' },
        },
        required: [
          'question_number', 'question_type', 'prompt_style', 'choice_style',
          'answer_basis_type', 'wrong_choice_pattern', 'difficulty',
          'intent', 'uses_reference_box', 'pattern_summary',
        ],
        additionalProperties: false,
      },
    },
  },
  required: [
    'passageGroupLabel', 'area', 'passageTitle', 'passageAuthor',
    'passageContent', 'sharedBoxContent', 'questions', 'patterns',
  ],
  additionalProperties: false,
} as const;

export interface AnalyzeResult {
  output: Record<string, unknown>;
  usage: { model: string; input_tokens: number; output_tokens: number };
}

export async function runAnalyzeChunk(groupText: string): Promise<AnalyzeResult> {
  const response = await client.messages.parse({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: `당신은 국어 시험지 OCR 텍스트를 구조화하고 출제 패턴을 분석하는 전문가입니다.
두 가지를 동시에 수행합니다:
1. OCR 텍스트에서 지문·문항·선택지를 정확히 파싱
2. 각 문항의 출제 패턴 분석 (나중에 새 지문에 동일 패턴 적용 목적)
OCR 오류로 글자가 깨진 경우도 한국어 맥락으로 복원하여 처리하세요.`,
    messages: [{
      role: 'user',
      content: `다음 국어 시험지 지문 그룹을 구조화하고 패턴을 분석하세요.

[지문 그룹 텍스트]
${groupText}

[구조화 규칙]
- passageContent: 문제 번호·선택지를 제외한 본문만
- choices: ①②③④⑤ 또는 1)2)3) 형태 모두 인식
- 지문 없이 문항만 있는 경우 passageContent는 빈 문자열

[패턴 분석 규칙]
- patterns는 questions와 순서가 일치해야 함
- pattern_summary: 새 지문에 동일 패턴 적용 시 참고할 한 문장 요약`,
    }],
    output_config: {
      format: jsonSchemaOutputFormat(GroupSchema as Parameters<typeof jsonSchemaOutputFormat>[0]),
    },
  });

  const parsed = response.parsed_output as Record<string, unknown> | null;
  if (!parsed) throw new Error('analyze chunk: 분석 결과를 생성하지 못했습니다.');

  // id 추가
  const output = {
    ...parsed,
    questions: (parsed.questions as Array<Record<string, unknown>> ?? []).map(q => ({
      ...q,
      id: crypto.randomUUID(),
    })),
  };

  return {
    output,
    usage: {
      model: 'claude-sonnet-4-6',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}
