import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";

const client = new Anthropic();

const AnalysisSchema = {
  type: "object",
  properties: {
    analysis_summary: {
      type: "string",
      description: "지문 전체 내용 요약 (200자 내외)",
    },
    key_points: {
      type: "string",
      description: "지문의 핵심 내용, 주제, 논지를 3~5문장으로 정리",
    },
    candidate_question_points: {
      type: "array",
      items: {
        type: "object",
        properties: {
          element: {
            type: "string",
            description: "출제 가능한 요소명. 예: '화자의 정서와 태도', '논지 전개 방식', '어휘 및 표현'",
          },
          description: {
            type: "string",
            description: "왜 이 요소가 출제 가능한지, 어떤 지점이 문제로 나올 수 있는지 설명",
          },
          question_type: {
            type: "string",
            description: "예상 문항 유형: 내용이해, 추론, 표현분석, 어휘문법, 비판적사고, 적용 중 하나",
          },
        },
        required: ["element", "description", "question_type"],
      },
    },
  },
  required: ["analysis_summary", "key_points", "candidate_question_points"],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { passage_text, area, source_type } = body;

    if (!passage_text?.trim()) {
      return NextResponse.json({ error: "지문 내용이 없습니다." }, { status: 400 });
    }

    const systemPrompt = `당신은 국어 교육 전문가로, 지문을 분석하여 내신 대비 문제 출제 가능 요소를 파악합니다.
영역(${area || "국어"})과 출처 유형(${source_type || "일반"})을 고려해 분석하세요.`;

    const userPrompt = `다음 지문을 분석하여 내신 대비 출제 가능 요소를 추출하세요.

[지문]
${passage_text}

분석 항목:
1. analysis_summary: 지문 전체 내용을 200자 내외로 요약
2. key_points: 핵심 내용·주제·논지를 3~5문장으로 정리
3. candidate_question_points: 내신 시험에 출제될 수 있는 요소를 5~8개 추출
   - 각 요소마다 출제 가능 이유와 예상 문항 유형 포함
   - 실제 내신에서 자주 나오는 발문 패턴 기준으로 분석`;

    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        format: jsonSchemaOutputFormat(AnalysisSchema as Parameters<typeof jsonSchemaOutputFormat>[0]),
      },
    });

    const parsed = response.parsed_output as {
      analysis_summary: string;
      key_points: string;
      candidate_question_points: { element: string; description: string; question_type: string }[];
    } | null;

    if (!parsed) return NextResponse.json({ error: "분석 결과를 생성하지 못했습니다." }, { status: 500 });
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("/api/source-passages/analyze error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "지문 분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
