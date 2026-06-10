import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { createServerSupabase } from "@/lib/supabase-server";
import { PatternBasedQuestion } from "@/types/pattern-remix";

export const maxDuration = 300;

const client = new Anthropic();

const GenerationSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question_number:  { type: "number" },
          question_type:    { type: "string", description: "내용이해, 추론, 표현분석, 어휘문법, 비판적사고, 적용, 서술형 중 하나" },
          difficulty:       { type: "string", description: "기본, 응용, 고난도 중 하나" },
          question_text:    { type: "string", description: "발문 전체 (완성된 문장)" },
          choices: {
            type: "array",
            items: {
              type: "object",
              properties: {
                number:     { type: "number" },
                text:       { type: "string" },
                is_correct: { type: "boolean" },
                reason:     { type: "string", description: "정답이면 지문 근거, 오답이면 오답 이유" },
              },
              required: ["number", "text", "is_correct", "reason"],
            },
          },
          answer:              { type: "number", description: "정답 번호. 서술형은 0" },
          explanation:         { type: "string", description: "이 문항의 상세 해설" },
          descriptive_answer:  { type: "string", description: "서술형 모범 답안. 객관식은 빈 문자열" },
          pattern_reference:   { type: "string", description: "어떤 기출 패턴을 적용했는지 한 줄 설명" },
        },
        required: [
          "question_number", "question_type", "difficulty", "question_text",
          "choices", "answer", "explanation", "descriptive_answer", "pattern_reference",
        ],
      },
    },
  },
  required: ["questions"],
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { pattern_set_id, source_passage_id } = await request.json();
    if (!pattern_set_id || !source_passage_id) {
      return NextResponse.json({ error: "패턴 세트와 지문을 선택하세요." }, { status: 400 });
    }

    // DB에서 패턴 세트 + 지문 조회
    const [{ data: patternSet }, { data: passage }] = await Promise.all([
      supabase.from("exam_pattern_sets")
        .select("*, exam_patterns(*)")
        .eq("id", pattern_set_id)
        .eq("user_id", user.id)
        .single(),
      supabase.from("source_passages")
        .select("*")
        .eq("id", source_passage_id)
        .eq("user_id", user.id)
        .single(),
    ]);

    if (!patternSet) return NextResponse.json({ error: "패턴 세트를 찾을 수 없습니다. 본인 소유의 패턴 세트인지 확인하세요." }, { status: 404 });
    if (!passage) return NextResponse.json({ error: "지문을 찾을 수 없습니다. 본인 소유의 지문인지 확인하세요." }, { status: 404 });
    if (!passage.passage_text?.trim()) return NextResponse.json({ error: "선택한 지문에 텍스트가 없습니다. 지문 등록에서 내용을 입력해주세요." }, { status: 400 });

    const patterns = patternSet.exam_patterns ?? [];
    if (patterns.length === 0) {
      return NextResponse.json({ error: "패턴 세트에 추출된 패턴이 없습니다." }, { status: 400 });
    }

    // 패턴 목록 텍스트 구성
    const patternsText = patterns
      .map((p: Record<string, unknown>, i: number) => `
[기출 패턴 ${i + 1}번]
- 문항 유형: ${p.question_type}
- 발문 방식: ${p.prompt_style}
- 선택지 구성: ${p.choice_style}
- 정답 근거 방식: ${p.answer_basis_type}
- 오답 패턴: ${p.wrong_choice_pattern}
- 난이도: ${p.difficulty}
- 출제 의도: ${p.intent}
- 보기 활용: ${p.uses_reference_box ? "있음" : "없음"}
- 패턴 요약: ${p.pattern_summary}`.trim())
      .join("\n\n");

    const systemPrompt = `당신은 국어 내신 문제 출제 전문가입니다.
기출문제에서 추출된 출제 패턴을 새 지문에 적용하여 내신 대비 문제를 생성합니다.

절대 원칙:
1. 기존 기출문제 문장을 그대로 복사하지 않는다
2. 새 지문에 없는 내용을 정답 근거로 사용하지 않는다
3. 정답 근거는 반드시 새 지문 안에서 확인 가능해야 한다
4. 오답 선택지는 그럴듯하지만 새 지문 기준으로 명확히 틀려야 한다
5. 기출 패턴의 발문 방식·선택지 구성·난이도를 새 지문에 맞게 적용한다`;

    const userPrompt = `다음 새 지문에 기출 패턴들을 적용하여 내신 대비 문제를 생성하세요.

═══ 새 지문 정보 ═══
제목: ${passage.title}
영역: ${passage.area || "국어"}
출처: ${passage.source_type || ""}

[지문 전문]
${passage.passage_text}

${passage.key_points ? `[핵심 내용]\n${passage.key_points}` : ""}

═══ 적용할 기출 패턴 (${patterns.length}개) ═══
${patternsText}

═══ 생성 지시 ═══
위 ${patterns.length}개의 기출 패턴을 순서대로 새 지문에 적용하여 ${patterns.length}개의 문제를 생성하세요.
- 각 문제는 해당 기출 패턴의 발문 방식·선택지 구성·난이도를 유지
- 객관식은 5지선다(1~5번), 선택지별 정오 이유 포함
- 서술형 패턴이 있으면 choices=[], answer=0, descriptive_answer에 모범 답안
- 해설은 지문 근거를 명시하여 상세하게
- question_number는 1부터 순서대로`;

    const response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        format: jsonSchemaOutputFormat(GenerationSchema as Parameters<typeof jsonSchemaOutputFormat>[0]),
      },
    });

    const parsed = response.parsed_output as { questions: PatternBasedQuestion[] } | null;
    if (!parsed) return NextResponse.json({ error: "문제 생성에 실패했습니다." }, { status: 500 });

    return NextResponse.json({ questions: parsed.questions });
  } catch (err) {
    console.error("/api/pattern-remix/generate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "문제 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
