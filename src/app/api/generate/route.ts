import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { StructuredResult, AnalysisResult, GenerationResult } from "@/types/index";

const GeneratedQuestionSchema = {
  type: "object",
  properties: {
    type: { type: "string", description: "유사 | 변형 | 서술형" },
    difficulty: { type: "string", description: "기본 | 응용 | 고난도" },
    questionText: { type: "string" },
    choices: {
      type: "array",
      items: {
        type: "object",
        properties: {
          number: { type: "number" },
          text: { type: "string" },
          isCorrect: { type: "boolean" },
          reason: { type: "string" },
        },
        required: ["number", "text", "isCorrect", "reason"],
        additionalProperties: false,
      },
    },
    answer: { type: "number", description: "정답 번호 1~5. 서술형은 0" },
    explanation: { type: "string" },
    descriptiveAnswer: { type: "string", description: "서술형 모범 답안. 객관식은 빈 문자열" },
  },
  required: ["type", "difficulty", "questionText", "choices", "answer", "explanation", "descriptiveAnswer"],
  additionalProperties: false,
} as const;

const GenerationOutputSchema = {
  type: "object",
  properties: {
    similarQuestions: {
      type: "array",
      items: GeneratedQuestionSchema,
    },
    variantQuestions: {
      type: "array",
      items: GeneratedQuestionSchema,
    },
    descriptiveQuestion: GeneratedQuestionSchema,
  },
  required: ["similarQuestions", "variantQuestions", "descriptiveQuestion"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `당신은 한국 국어 시험 문항을 출제하는 전문가입니다.
주어진 지문과 원문 문항 분석 결과를 바탕으로 유사 유형 문제, 변형 유형 문제, 서술형 문제를 출제합니다.
출제된 문제는 실제 수능·내신 수준의 품질을 갖춰야 하며, 지문 내용에 근거해야 합니다.`;

const CIRCLE = ["①", "②", "③", "④", "⑤"];

function buildPrompt(structured: StructuredResult, analysis: AnalysisResult): string {
  const lines: string[] = [];

  lines.push("[지문]");
  if (structured.passageTitle) lines.push(`제목: ${structured.passageTitle}`);
  if (structured.passageAuthor) lines.push(`작가/출처: ${structured.passageAuthor}`);
  if (structured.passageContent) lines.push(structured.passageContent);
  if (structured.sharedBoxContent) {
    lines.push("\n[공통 보기]");
    lines.push(structured.sharedBoxContent);
  }

  lines.push("\n[원문 문항 분석]");
  lines.push(`지문 핵심: ${analysis.passageKeyPoints}`);

  for (const qa of analysis.questions) {
    const orig = structured.questions.find((q) => q.questionNumber === qa.questionNumber);
    lines.push(`\n▶ 문항 ${qa.questionNumber}번`);
    if (orig) lines.push(`발문: ${orig.questionText}`);
    lines.push(`출제 의도: ${qa.intent}`);
    lines.push(`정답: ${qa.answerNumber}번`);
    lines.push(`변형 포인트: ${qa.variantElements}`);
    if (orig) {
      for (const c of orig.choices) {
        lines.push(`  ${CIRCLE[c.number - 1]} ${c.text}`);
      }
    }
  }

  lines.push("\n[생성 요청]");
  lines.push("아래 기준으로 문제를 생성하세요:\n");
  lines.push("■ 유사 유형 문제 3개 (similarQuestions)");
  lines.push("- 원문 문항과 같은 출제 의도를 유지하되 발문·선택지 표현을 다르게 구성");
  lines.push("- 각 문제는 5지선다 객관식, 난이도는 기본/응용/고난도 중 하나");
  lines.push("- type 필드: \"유사\"\n");
  lines.push("■ 변형 유형 문제 3개 (variantQuestions)");
  lines.push("- 같은 지문·개념을 활용하되 묻는 방식(표현상 특징, 시어 의미, 추론, 적용 등)을 바꿈");
  lines.push("- 각 문제는 5지선다 객관식, 난이도는 기본/응용/고난도 중 하나");
  lines.push("- type 필드: \"변형\"\n");
  lines.push("■ 서술형 문제 1개 (descriptiveQuestion)");
  lines.push("- 같은 지문 기반, 논술형 또는 서술형 문제");
  lines.push("- choices 배열은 빈 배열 [], answer는 0");
  lines.push("- descriptiveAnswer 필드에 모범 답안 포함");
  lines.push("- type 필드: \"서술형\"\n");
  lines.push("모든 문제에 explanation(해설)과 각 선택지별 정오 판단·이유를 포함하세요.");

  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "서비스 설정 오류" }, { status: 500 });
  }

  let body: { structured?: StructuredResult; analysis?: AnalysisResult };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 데이터가 없습니다" }, { status: 400 });
  }

  const { structured, analysis } = body;
  if (!structured || !analysis) {
    return NextResponse.json({ error: "구조화 결과와 분석 결과가 필요합니다" }, { status: 400 });
  }
  if (!structured.questions || structured.questions.length === 0) {
    return NextResponse.json({ error: "생성할 원문 문항이 없습니다" }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(structured, analysis) }],
      output_config: {
        format: jsonSchemaOutputFormat(GenerationOutputSchema),
      },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      return NextResponse.json({ error: "문제 생성에 실패했습니다" }, { status: 500 });
    }

    const mapQuestion = (q: (typeof parsed.similarQuestions)[number]) => ({
      type: q.type as GenerationResult["similarQuestions"][number]["type"],
      difficulty: q.difficulty as GenerationResult["similarQuestions"][number]["difficulty"],
      questionText: q.questionText,
      choices: (q.choices ?? []).map((c) => ({
        number: c.number,
        text: c.text,
        isCorrect: c.isCorrect,
        reason: c.reason,
      })),
      answer: q.answer,
      explanation: q.explanation,
      descriptiveAnswer: q.descriptiveAnswer ?? "",
    });

    const result: GenerationResult = {
      similarQuestions: (parsed.similarQuestions ?? []).map(mapQuestion),
      variantQuestions: (parsed.variantQuestions ?? []).map(mapQuestion),
      descriptiveQuestion: mapQuestion(parsed.descriptiveQuestion),
    };

    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `API 오류: ${error.message}` }, { status: 500 });
    }
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
