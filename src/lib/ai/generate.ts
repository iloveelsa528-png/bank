import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import type { PatternBasedQuestion } from '@/types/pattern-remix';

const client = new Anthropic();

export interface GeneratePattern {
  question_type: string;
  prompt_style: string;
  choice_style: string;
  answer_basis_type: string;
  wrong_choice_pattern: string;
  difficulty: string;
  intent: string;
  uses_reference_box: boolean;
  pattern_summary: string;
}

const GenerationSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question_number:  { type: 'number' },
          question_type:    { type: 'string', description: '내용이해, 추론, 표현분석, 어휘문법, 비판적사고, 적용, 서술형 중 하나' },
          difficulty:       { type: 'string', description: '기본, 응용, 고난도 중 하나' },
          question_text:    { type: 'string', description: '발문 전체 (완성된 문장)' },
          choices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                number:     { type: 'number' },
                text:       { type: 'string' },
                is_correct: { type: 'boolean' },
                reason:     { type: 'string', description: '정답이면 지문 근거, 오답이면 오답 이유' },
              },
              required: ['number', 'text', 'is_correct', 'reason'],
            },
          },
          answer:              { type: 'number', description: '정답 번호. 서술형은 0' },
          explanation:         { type: 'string', description: '이 문항의 상세 해설' },
          descriptive_answer:  { type: 'string', description: '서술형 모범 답안. 객관식은 빈 문자열' },
          pattern_reference:   { type: 'string', description: '어떤 기출 패턴을 적용했는지 한 줄 설명' },
        },
        required: [
          'question_number', 'question_type', 'difficulty', 'question_text',
          'choices', 'answer', 'explanation', 'descriptive_answer', 'pattern_reference',
        ],
      },
    },
  },
  required: ['questions'],
} as const;

export interface GenerateResult {
  output: { questions: PatternBasedQuestion[] };
  usage: { model: string; input_tokens: number; output_tokens: number };
}

export async function runGenerateChunk(
  patterns: GeneratePattern[],
  passageText: string,
  passageTitle: string,
  passageArea: string,
  passageKeyPoints: string,
  startNumber: number,
  passageAnalysisSummary?: string,
  passageCandidatePoints?: string,
  genreAdaptation?: boolean,
): Promise<GenerateResult> {
  const patternsText = patterns
    .map((p, i) => `
[패턴 ${startNumber + i}번]
- 문항 유형: ${p.question_type}
- 발문 방식: ${p.prompt_style}
- 선택지 구성: ${p.choice_style}
- 정답 근거 방식: ${p.answer_basis_type}
- 오답 패턴: ${p.wrong_choice_pattern}
- 난이도: ${p.difficulty}
- 출제 의도: ${p.intent}
- 보기 활용: ${p.uses_reference_box ? '있음 (지문에 맞지 않으면 생략 가능)' : '없음'}
- 패턴 요약: ${p.pattern_summary}`.trim())
    .join('\n\n');

  // 지문 분석 정보가 있으면 참고용으로 포함
  const analysisSection = [
    passageAnalysisSummary ? `[지문 분석 요약]\n${passageAnalysisSummary}` : '',
    passageKeyPoints ? `[핵심 내용]\n${passageKeyPoints}` : '',
    passageCandidatePoints ? `[출제 가능 요소]\n${passageCandidatePoints}` : '',
  ].filter(Boolean).join('\n\n');

  const response = await client.messages.parse({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    system: genreAdaptation === false
      ? `당신은 국어 내신 문제 출제 전문가입니다.
기출문제의 출제 패턴을 새 지문에 적용하여 내신 대비 문제를 생성합니다.

엄격 모드 — 장르·영역을 엄수한다:
1. 문학(시/소설/수필) 패턴은 문학 지문에, 독서(설명문/논설문) 패턴은 독서 지문에 적용한다
2. 장르 특성을 그대로 유지한다 — 시는 운율·이미지·화자, 소설은 인물·사건·배경, 독서는 논리 구조·개념·근거
3. 패턴의 발문 방식·선택지 구성·난이도를 새 지문에 그대로 적용한다
4. 정답 근거는 반드시 새 지문 안에서 찾을 수 있어야 한다
5. 오답 선택지는 그럴듯하지만 지문 기준으로 명확히 틀려야 한다
6. 패턴 수만큼 반드시 생성한다
7. 기존 기출문제 문장을 그대로 복사하지 않는다`
      : `당신은 국어 내신 문제 출제 전문가입니다.
기출문제의 출제 유형(난이도·묻는 방식)을 새 지문에 창의적으로 적용하여 내신 대비 문제를 생성합니다.

자유 변환 모드 핵심 원칙:

[절대 금지]
- 원본 기출의 (가)(나)(다)(라) 같은 구조 레이블을 새 지문에 없는데도 사용하는 것
- 새 지문에 존재하지 않는 인물·화자·작품을 언급하는 것
- 원본 기출의 특정 시구·구절을 그대로 인용하는 것

[장르 변환 규칙]
기출이 문학이고 새 지문이 독서(비문학)인 경우:
  - "복수 작품(가~다)의 공통점" → "지문에서 제시된 두 관점/두 이론의 공통점"
  - "화자의 정서·태도" → "필자의 관점·논지"
  - "시어/이미지의 의미" → "핵심 개념/용어의 의미"
  - "산문 배경지식 제시문 + 작품 해석" → "추가 정보 <보기> + 지문 내용 적용"
  - "표현 방식 감상" → "논지 전개 방식·서술 방식 분석"

기출이 독서이고 새 지문이 문학인 경우:
  - "정보 구조 파악" → "사건 전개·갈등 구조 파악"
  - "논지 이해" → "주제 의식·작가 의도 파악"

[공통 원칙]
1. 패턴에서 가져올 것: 출제 의도, 난이도, 오답 구성 방식, 정답 근거 유형
2. 새 지문에서 만들 것: 발문 내용, 선택지 내용, 인용 구절 — 모두 새 지문 기반
3. 정답 근거는 반드시 새 지문 안에서 찾을 수 있어야 한다
4. 오답 선택지는 그럴듯하지만 지문 기준으로 명확히 틀려야 한다
5. 패턴 수만큼 반드시 생성한다 — 지문이 짧아도 문항 수를 줄이지 않는다`,
    messages: [{
      role: 'user',
      content: `다음 새 지문에 기출 패턴들을 적용하여 문제를 생성하세요.

═══ 새 지문 정보 ═══
제목: ${passageTitle}
영역: ${passageArea || '국어'}

[지문 전문]
${passageText}

${analysisSection}

═══ 적용할 패턴 (${patterns.length}개) ═══
${patternsText}

═══ 생성 지시 ═══
위 ${patterns.length}개의 패턴을 순서대로 적용하여 ${patterns.length}개의 문제를 생성하세요.
- question_number는 ${startNumber}부터 ${startNumber + patterns.length - 1}까지
- 패턴의 형식이 새 지문과 맞지 않으면 출제 의도를 유지하되 지문에 맞게 변형
- 객관식은 5지선다(1~5번), 선택지별 정오 이유 포함
- 서술형 패턴이 있으면 choices=[], answer=0, descriptive_answer에 모범 답안
- 해설은 지문 근거를 명시하여 상세하게`,
    }],
    output_config: {
      format: jsonSchemaOutputFormat(GenerationSchema as Parameters<typeof jsonSchemaOutputFormat>[0]),
    },
  });

  const parsed = response.parsed_output as { questions: PatternBasedQuestion[] } | null;
  if (!parsed) throw new Error('generate chunk: 문제 생성에 실패했습니다.');

  return {
    output: { questions: parsed.questions },
    usage: {
      model: 'claude-sonnet-4-6',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}
