import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";

export const maxDuration = 120;

const client = new Anthropic();

// 구조화 + 패턴 추출을 단일 Claude Sonnet 호출로 통합
const CombinedSchema = {
  type: "object",
  properties: {
    groups: {
      type: "array",
      items: {
        type: "object",
        properties: {
          passageGroupLabel:  { type: "string", description: "지문 그룹 라벨 예: '[11~14]'. 없으면 빈 문자열" },
          area:               { type: "string", description: "문학, 독서, 문법, 화작, 기타 중 하나" },
          passageTitle:       { type: "string", description: "작품명. 없으면 빈 문자열" },
          passageAuthor:      { type: "string", description: "작가/출처. 없으면 빈 문자열" },
          passageContent:     { type: "string", description: "지문 본문만 (문제·선택지 제외). 없으면 빈 문자열" },
          sharedBoxContent:   { type: "string", description: "공통 [보기]. 없으면 빈 문자열" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                questionNumber: { type: "number" },
                questionText:   { type: "string" },
                boxText:        { type: "string", description: "이 문항에만 붙은 보기. 없으면 빈 문자열" },
                choices: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      number: { type: "number" },
                      text:   { type: "string" },
                    },
                    required: ["number", "text"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questionNumber", "questionText", "boxText", "choices"],
              additionalProperties: false,
            },
          },
          patterns: {
            type: "array",
            description: "이 그룹 각 문항의 출제 패턴. questions 배열과 순서/개수 일치",
            items: {
              type: "object",
              properties: {
                question_number:      { type: "number" },
                question_type:        { type: "string", description: "내용이해, 추론, 비판적사고, 표현분석, 어휘문법, 적용, 기타 중 하나" },
                prompt_style:         { type: "string", description: "발문 방식 특징" },
                choice_style:         { type: "string", description: "선택지 구성 방식" },
                answer_basis_type:    { type: "string", description: "정답 근거 방식" },
                wrong_choice_pattern: { type: "string", description: "오답 선택지 패턴" },
                difficulty:           { type: "string", description: "기본, 응용, 고난도 중 하나" },
                intent:               { type: "string", description: "출제 의도 한 문장" },
                uses_reference_box:   { type: "boolean" },
                pattern_summary:      { type: "string", description: "새 지문 적용 시 참고할 패턴 요약 한 문장" },
              },
              required: [
                "question_number", "question_type", "prompt_style", "choice_style",
                "answer_basis_type", "wrong_choice_pattern", "difficulty",
                "intent", "uses_reference_box", "pattern_summary",
              ],
              additionalProperties: false,
            },
          },
        },
        required: [
          "passageGroupLabel", "area", "passageTitle", "passageAuthor",
          "passageContent", "sharedBoxContent", "questions", "patterns",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["groups"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `당신은 국어 시험지 OCR 텍스트를 구조화하고 출제 패턴을 분석하는 전문가입니다.
두 가지를 동시에 수행합니다:
1. OCR 텍스트에서 지문 그룹·문항·선택지를 정확히 파싱
2. 각 문항의 출제 패턴 분석 (나중에 새 지문에 동일 패턴 적용 목적)

OCR 오류로 글자가 깨진 경우도 한국어 맥락으로 복원하여 처리하세요.`;

function buildPrompt(text: string): string {
  return `다음 국어 시험지 OCR 텍스트를 분석하세요.

[OCR 텍스트]
${text}

[구조화 규칙]
- 여러 지문 그룹이 있으면 각각 별도 항목으로 분리
- "[11~14] 다음 글을 읽고..." 형태가 새 그룹 시작
- passageContent: 문제 번호·선택지를 제외한 본문만
- 지문 없이 문항만 있는 경우(문법 등) passageContent는 빈 문자열
- choices: ①②③④⑤ 또는 1)2)3) 형태 모두 인식
- 불완전 그룹(선택지 없는 문항만 있거나 지문이 잘린 경우) 제외

[패턴 분석 규칙]
- 각 그룹의 patterns는 questions와 순서가 일치해야 함
- question_type: 내용이해/추론/비판적사고/표현분석/어휘문법/적용/기타
- pattern_summary: 새 지문에 동일 패턴 적용 시 참고할 한 문장 요약
- 선택지가 없는 서술형 문항도 패턴 분석 포함`;
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "분석할 텍스트가 없습니다." }, { status: 400 });
    }

    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(text) }],
      output_config: {
        format: jsonSchemaOutputFormat(CombinedSchema as Parameters<typeof jsonSchemaOutputFormat>[0]),
      },
    });

    const parsed = response.parsed_output as {
      groups: Array<{
        passageGroupLabel: string;
        area: string;
        passageTitle: string;
        passageAuthor: string;
        passageContent: string;
        sharedBoxContent: string;
        questions: Array<{
          questionNumber: number;
          questionText: string;
          boxText: string;
          choices: Array<{ number: number; text: string }>;
        }>;
        patterns: Array<{
          question_number: number;
          question_type: string;
          prompt_style: string;
          choice_style: string;
          answer_basis_type: string;
          wrong_choice_pattern: string;
          difficulty: string;
          intent: string;
          uses_reference_box: boolean;
          pattern_summary: string;
        }>;
      }>;
    } | null;

    if (!parsed) {
      return NextResponse.json({ error: "분석 결과를 생성하지 못했습니다." }, { status: 500 });
    }

    // 불완전 그룹 필터링 + id 추가
    const groups = parsed.groups
      .filter(g => {
        if (g.questions.length === 0) return false;
        if (!g.questions.some(q => q.questionText.trim())) return false;
        if (g.passageContent?.trimEnd().endsWith("[잘림]")) return false;
        return true;
      })
      .map(g => ({
        ...g,
        passageGroupLabel: g.passageGroupLabel || undefined,
        passageTitle:      g.passageTitle || undefined,
        passageAuthor:     g.passageAuthor || undefined,
        passageContent:    g.passageContent || undefined,
        sharedBoxContent:  g.sharedBoxContent || undefined,
        questions: g.questions.map(q => ({
          id:             crypto.randomUUID(),
          questionNumber: q.questionNumber,
          questionText:   q.questionText,
          boxText:        q.boxText || undefined,
          choices:        q.choices,
        })),
      }));

    return NextResponse.json({ groups });
  } catch (err) {
    console.error("/api/patterns/analyze-all error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
