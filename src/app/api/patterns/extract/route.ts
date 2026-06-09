import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { StructuredResult } from "@/types/index";
import { ExamPattern } from "@/types/patterns";

const client = new Anthropic();

const PatternOutputSchema = {
  type: "object",
  properties: {
    patterns: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question_number: { type: "number" },
          question_type: {
            type: "string",
            description: "문항 유형: 내용이해, 추론, 비판적사고, 표현분석, 어휘문법, 적용, 기타 중 하나",
          },
          prompt_style: {
            type: "string",
            description: "발문 방식. 예: '윗글을 읽고 이해한 내용으로 적절한 것은?', '윗글의 ㉠에 대한 설명으로 가장 적절한 것은?'",
          },
          choice_style: {
            type: "string",
            description: "선택지 구성 방식. 예: '서술형 한 줄', '단어+구절 혼합', '도식+설명 결합', '긴 서술형 2줄'",
          },
          answer_basis_type: {
            type: "string",
            description: "정답 근거 방식. 예: '지문 직접 인용', '추론 및 종합', '지문과 보기 비교', '어휘 의미 파악'",
          },
          wrong_choice_pattern: {
            type: "string",
            description: "오답 선택지 패턴. 예: '지문 내용 왜곡', '과도한 일반화', '범위 오류', '반대 내용 제시'",
          },
          difficulty: {
            type: "string",
            description: "난이도: 기본, 응용, 고난도 중 하나",
          },
          intent: {
            type: "string",
            description: "출제 의도를 한 문장으로",
          },
          uses_reference_box: {
            type: "boolean",
            description: "<보기> 자료를 활용하는 문항이면 true",
          },
          pattern_summary: {
            type: "string",
            description: "이 문항의 출제 패턴을 한 문장으로 요약. 다음 번에 새 지문에 같은 패턴을 적용할 때 참고할 수 있도록 작성",
          },
        },
        required: [
          "question_number", "question_type", "prompt_style", "choice_style",
          "answer_basis_type", "wrong_choice_pattern", "difficulty",
          "intent", "uses_reference_box", "pattern_summary",
        ],
      },
    },
  },
  required: ["patterns"],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const structured: StructuredResult = body.structured;
    if (!structured) return NextResponse.json({ error: "structured 데이터가 없습니다." }, { status: 400 });

    const questionsText = (structured.questions ?? []).map((q) => {
      const choices = (q.choices ?? []).map((c) => `  ${c.number}. ${c.text}`).join("\n");
      const box = q.boxText ? `\n[보기]\n${q.boxText}` : "";
      return `[${q.questionNumber}번] ${q.questionText}${box}\n${choices}`;
    }).join("\n\n");

    const systemPrompt = `당신은 국어 기출문제 출제 패턴 분석 전문가입니다.
주어진 기출문제 데이터를 분석하여 각 문항의 출제 패턴을 추출합니다.
패턴은 나중에 새 지문에 그대로 적용하여 유사한 내신 대비 문제를 생성할 때 사용됩니다.`;

    const userPrompt = `다음 국어 기출시험지 문항 데이터에서 각 문항의 출제 패턴을 분석하세요.

영역: ${structured.area}
지문: ${structured.passageContent ? structured.passageContent.slice(0, 300) + "..." : "(없음)"}
${structured.sharedBoxContent ? `공통 보기: ${structured.sharedBoxContent.slice(0, 200)}` : ""}

문항 데이터:
${questionsText}

각 문항에 대해:
1. 어떤 유형(내용이해/추론/표현분석/비판적사고/어휘문법/적용)의 문제인지
2. 발문 방식의 특징 (어떤 문장 패턴으로 묻는지)
3. 선택지 구성 방식 (길이, 형식, 구조)
4. 정답 근거 방식 (지문 어디서/어떻게 찾는지)
5. 오답 선택지 패턴 (어떻게 오답을 구성했는지)
6. 난이도
7. 출제 의도
8. 보기 활용 여부
9. 이 패턴을 새 지문에 적용할 때를 위한 패턴 요약

을 분석하여 반환하세요.`;

    const response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        format: jsonSchemaOutputFormat(PatternOutputSchema as Parameters<typeof jsonSchemaOutputFormat>[0]),
      },
    });

    const parsed = response.parsed_output as { patterns: ExamPattern[] } | null;
    if (!parsed) return NextResponse.json({ error: "패턴 추출 결과를 생성하지 못했습니다." }, { status: 500 });
    return NextResponse.json({ patterns: parsed.patterns });
  } catch (err) {
    console.error("/api/patterns/extract error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "패턴 추출 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
