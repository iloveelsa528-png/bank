import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { StructuredResult, AnalysisResult, GenerationResult } from "@/types/index";

// GET /api/problems?school=&grade=&area=&difficulty=&q=
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const school = searchParams.get("school") || "";
  const grade = searchParams.get("grade") || "";
  const area = searchParams.get("area") || "";
  const difficulty = searchParams.get("difficulty") || "";
  const q = searchParams.get("q") || "";

  let query = supabase
    .from("problems")
    .select("id, title, school_name, grade, subject_area, unit_name, difficulty, created_at")
    .order("created_at", { ascending: false });

  if (school) query = query.ilike("school_name", `%${school}%`);
  if (grade) query = query.eq("grade", grade);
  if (area) query = query.eq("subject_area", area);
  if (difficulty) query = query.eq("difficulty", difficulty);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ problems: data ?? [] });
}

// POST /api/problems — 저장
export async function POST(request: NextRequest) {
  let body: {
    meta: { title: string; schoolName: string; grade: string; subjectArea: string; unitName: string; difficulty: string };
    ocrRawText: string;
    ocrEditedText: string;
    structured: StructuredResult | null;
    analysis: AnalysisResult | null;
    generation: GenerationResult | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 데이터가 없습니다" }, { status: 400 });
  }

  const { meta, ocrRawText, ocrEditedText, structured, analysis, generation } = body;

  // problems 테이블에 저장
  const { data: problem, error: probErr } = await supabase
    .from("problems")
    .insert({
      title: meta.title || "제목 없음",
      school_name: meta.schoolName,
      grade: meta.grade,
      subject_area: meta.subjectArea,
      unit_name: meta.unitName,
      difficulty: meta.difficulty,
      ocr_raw_text: ocrRawText,
      ocr_edited_text: ocrEditedText,
      structured_data: structured ?? null,
      original_analysis: analysis ?? null,
    })
    .select()
    .single();

  if (probErr) return NextResponse.json({ error: probErr.message }, { status: 500 });

  // generated_questions 테이블에 생성 문제 저장
  if (generation && problem) {
    const allGenerated = [
      ...generation.similarQuestions,
      ...generation.variantQuestions,
      generation.descriptiveQuestion,
    ];

    const rows = allGenerated.map((q) => ({
      problem_id: problem.id,
      question_type: q.type,
      difficulty: q.difficulty,
      question_text: q.questionText,
      choices: q.choices,
      answer: q.answer,
      explanation: q.explanation,
      descriptive_answer: q.descriptiveAnswer ?? "",
    }));

    const { error: genErr } = await supabase.from("generated_questions").insert(rows);
    if (genErr) return NextResponse.json({ error: genErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: problem.id });
}
