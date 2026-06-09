import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { StructuredResult, AnalysisResult } from "@/types/index";

const AnalysisOutputSchema = {
  type: "object",
  properties: {
    passageKeyPoints: {
      type: "string",
      description: "지문의 핵심 내용 요약 (200자 내외)",
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          questionNumber: { type: "number" },
          intent: { type: "string", description: "이 문항의 출제 의도" },
          answerNumber: { type: "number", description: "정답 번호 (1~5)" },
          answerBasis: {
            type: "string",
            description: "정답 근거 (지문의 어느 부분이 근거인지 포함)",
          },
          choiceAnalysis: {
            type: "array",
            items: {
              type: "object",
              properties: {
                number: { type: "number" },
                isCorrect: { type: "boolean" },
                reason: {
                  type: "string",
                  description: "정답이면 근거, 오답이면 오답 이유",
                },
              },
              required: ["number", "isCorrect", "reason"],
              additionalProperties: false,
            },
          },
          confusionPoints: {
            type: "string",
            description: "학생이 이 문항에서 헷갈릴 수 있는 지점",
          },
          variantElements: {
            type: "string",
            description: "이 문항을 변형하여 새 문제를 만들 수 있는 요소",
          },
        },
        required: [
          "questionNumber",
          "intent",
          "answerNumber",
          "answerBasis",
          "choiceAnalysis",
          "confusionPoints",
          "variantElements",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["passageKeyPoints", "questions"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `당신은 한국 국어 시험 문항을 분석하는 전문가입니다.
지문과 문항을 읽고 출제 의도, 정답 근거, 오답 이유, 학생이 헷갈릴 수 있는 지점을 정확하게 분석합니다.
분석은 구체적이고 지문 내용에 근거해야 합니다.`;

const CIRCLE = ["①", "②", "③", "④", "⑤"];

function buildPrompt(structured: StructuredResult): string {
  const lines: string[] = [];

  lines.push("[지문 정보]");
  lines.push(`영역: ${structured.area}`);
  if (structured.passageTitle) lines.push(`제목: ${structured.passageTitle}`);
  if (structured.passageAuthor) lines.push(`작가/출처: ${structured.passageAuthor}`);

  if (structured.passageContent) {
    lines.push("\n[지문]");
    lines.push(structured.passageContent);
  }

  if (structured.sharedBoxContent) {
    lines.push("\n[공통 보기]");
    lines.push(structured.sharedBoxContent);
  }

  lines.push("\n[문항 목록]");
  for (const q of structured.questions) {
    lines.push(`\n문항 ${q.questionNumber}: ${q.questionText}`);
    if (q.boxText) lines.push(`[보기] ${q.boxText}`);
    for (const c of q.choices) {
      lines.push(`  ${CIRCLE[c.number - 1] ?? c.number} ${c.text}`);
    }
  }

  lines.push("\n[분석 요청]");
  lines.push("위 지문과 문항들을 분석하세요:");
  lines.push("- 지문 핵심 내용을 200자 내외로 요약");
  lines.push("- 각 문항의 출제 의도 파악");
  lines.push("- 정답 번호와 지문 근거 제시");
  lines.push("- 각 선택지 정오 판단 및 이유 설명");
  lines.push("- 학생이 헷갈릴 수 있는 지점");
  lines.push("- 변형 문제 출제 가능 요소");

  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "서비스 설정 오류" }, { status: 500 });
  }

  let body: { structured?: StructuredResult };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 데이터가 없습니다" }, { status: 400 });
  }

  const { structured } = body;
  if (!structured || !structured.questions || structured.questions.length === 0) {
    return NextResponse.json({ error: "분석할 문항이 없습니다" }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(structured) }],
      output_config: {
        format: jsonSchemaOutputFormat(AnalysisOutputSchema),
      },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      return NextResponse.json(
        { error: "분석 결과를 생성하지 못했습니다" },
        { status: 500 }
      );
    }

    const result: AnalysisResult = {
      passageKeyPoints: parsed.passageKeyPoints,
      questions: (parsed.questions ?? []).map((q) => ({
        questionNumber: q.questionNumber,
        intent: q.intent,
        answerNumber: q.answerNumber,
        answerBasis: q.answerBasis,
        choiceAnalysis: (q.choiceAnalysis ?? []).map((c) => ({
          number: c.number,
          isCorrect: c.isCorrect,
          reason: c.reason,
        })),
        confusionPoints: q.confusionPoints,
        variantElements: q.variantElements,
      })),
    };

    return NextResponse.json({ result });
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
