import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { StructuredResult } from "@/types/index";

// 여러 지문 그룹을 배열로 반환하는 스키마
const StructuredOutputSchema = {
  type: "object",
  properties: {
    groups: {
      type: "array",
      items: {
        type: "object",
        properties: {
          passageGroupLabel: {
            type: "string",
            description: "지문 그룹 라벨. 예: '[11~14]', '[1~3]'. 없으면 빈 문자열",
          },
          area: {
            type: "string",
            description: "영역: 문학, 독서, 문법, 화작, 기타 중 하나",
          },
          passageTitle: { type: "string", description: "작품명. 없으면 빈 문자열" },
          passageAuthor: { type: "string", description: "작가/출처. 없으면 빈 문자열" },
          passageContent: { type: "string", description: "지문 본문. 없으면 빈 문자열" },
          sharedBoxContent: { type: "string", description: "공통 보기. 없으면 빈 문자열" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                questionNumber: { type: "number" },
                questionText: { type: "string" },
                boxText: { type: "string", description: "없으면 빈 문자열" },
                choices: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      number: { type: "number" },
                      text: { type: "string" },
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
        },
        required: [
          "passageGroupLabel",
          "area",
          "passageTitle",
          "passageAuthor",
          "passageContent",
          "sharedBoxContent",
          "questions",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["groups"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `당신은 국어 시험지 텍스트를 구조화하는 전문가입니다.
OCR로 추출된 텍스트는 일부 글자가 깨지거나 잘릴 수 있습니다. 그런 경우에도 포기하지 말고 최대한 해석하여 구조화하세요.`;

function buildUserPrompt(text: string): string {
  return `다음 국어 시험지 OCR 텍스트를 분석하여 구조화해주세요.

[OCR 텍스트]
${text}

[구조화 방식]
- OCR 텍스트에 여러 지문 그룹이 있으면 각 그룹을 별도 항목으로 분리합니다
- "[11~14] 다음 글을 읽고..." 같은 지시문이 새 그룹의 시작입니다
- 각 그룹은 해당 지시문에 속하는 지문과 문제만 포함합니다
- 다른 지문 그룹의 문제를 섞지 않습니다
- 지문 그룹이 하나뿐이면 groups 배열에 항목 하나만 반환합니다

[판단 기준]
- area: 시·소설·수필·희곡이면 "문학", 논설문·설명문이면 "독서", 문법 문제면 "문법", 말하기·쓰기·듣기면 "화작", 판단 어려우면 "기타"
- passageContent: 문제 번호와 선택지를 제외한 본문 지문만 포함
- sharedBoxContent: [보기], <보기>, ※보기 등으로 표시된 공통 예시 텍스트
- boxText: 특정 문제 번호 바로 아래 붙은 보기
- questionText: "~에 대한 설명으로 적절한 것은?", "윗글을 읽고..." 등 발문 텍스트
- choices: ①②③④⑤ 또는 1) 2) 3) 4) 5) 형태 모두 인식

[불완전 그룹 제외 — 최우선 규칙]
아래 조건 중 하나라도 해당하는 지문 그룹은 groups 배열에 포함하지 않습니다:
- 지문(passageContent)이 [잘림]으로 끝나거나 문장 중간에 끊겨 있는 경우
- 지문 범위 "[11~14]"가 4문제인데 실제 발문이 있는 문제가 절반 미만인 경우
- 지문 범위에 해당하는 문제가 단 하나도 없는 경우 (발문 텍스트가 전혀 없음)
- 문제는 있으나 선택지가 단 하나도 없는 문제만 있는 경우

[일반 텍스트 처리]
- OCR 텍스트가 깨진 경우 한국어 맥락으로 복원하여 포함합니다
- 선택지가 5개 미만이어도 읽을 수 있는 것은 포함합니다
- 값이 없는 문자열 필드는 빈 문자열("")로 반환합니다`;
}

// 빈 문자열을 undefined로 변환 (TypeScript 타입과 일치)
function emptyToUndefined(val: string | undefined): string | undefined {
  return val === "" ? undefined : val;
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "서비스 설정 오류" }, { status: 500 });
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "분석할 텍스트가 없습니다" }, { status: 400 });
  }

  const { text } = body;
  if (!text || typeof text !== "string" || text.trim() === "") {
    return NextResponse.json({ error: "분석할 텍스트가 없습니다" }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // messages.parse()로 JSON 구조 보장 — extractJSON/nullToUndefined 불필요
    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(text) }],
      output_config: {
        format: jsonSchemaOutputFormat(StructuredOutputSchema),
      },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      return NextResponse.json(
        { error: "구조화 결과를 생성하지 못했습니다" },
        { status: 500 }
      );
    }

    const groups = parsed.groups ?? [];
    const allResults: StructuredResult[] = groups.map((group) => ({
      passageGroupLabel: emptyToUndefined(group.passageGroupLabel),
      area: (group.area as StructuredResult["area"]) || "기타",
      passageTitle: emptyToUndefined(group.passageTitle),
      passageAuthor: emptyToUndefined(group.passageAuthor),
      passageContent: emptyToUndefined(group.passageContent),
      sharedBoxContent: emptyToUndefined(group.sharedBoxContent),
      questions: (group.questions ?? []).map((q) => ({
        id: crypto.randomUUID(),
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        boxText: emptyToUndefined(q.boxText),
        choices: (q.choices ?? []).map((c) => ({ number: c.number, text: c.text })),
      })),
    }));

    // 서버 측 후처리: 불완전 그룹 제거
    const results = allResults.filter((r) => {
      // 문제가 하나도 없으면 제외
      if (r.questions.length === 0) return false;
      // 발문 텍스트가 있는 문제가 하나도 없으면 제외
      const hasRealQuestion = r.questions.some((q) => q.questionText.trim() !== "");
      if (!hasRealQuestion) return false;
      // 지문이 [잘림]으로 끝나면 제외
      if (r.passageContent && r.passageContent.trimEnd().endsWith("[잘림]")) return false;
      return true;
    });

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API 오류: ${error.message}` },
        { status: 500 }
      );
    }
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
