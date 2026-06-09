import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { ExamPattern } from "@/types/patterns";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { data, error } = await supabase
      .from("exam_pattern_sets")
      .select("*, exam_patterns(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ patternSets: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "조회 실패" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const body = await request.json();
    const { meta, patterns }: { meta: Record<string, string>; patterns: ExamPattern[] } = body;

    if (!meta?.title?.trim()) {
      return NextResponse.json({ error: "제목을 입력하세요." }, { status: 400 });
    }

    // 패턴 세트 저장
    const { data: patternSet, error: setError } = await supabase
      .from("exam_pattern_sets")
      .insert({
        user_id: user.id,
        title: meta.title.trim(),
        school_name: meta.school_name ?? "",
        grade: meta.grade ?? "",
        semester: meta.semester ?? "",
        exam_name: meta.exam_name ?? "",
        area: meta.area ?? "",
        description: meta.description ?? "",
      })
      .select()
      .single();

    if (setError) throw setError;

    // 개별 패턴 저장
    if (patterns.length > 0) {
      const { error: patternsError } = await supabase
        .from("exam_patterns")
        .insert(
          patterns.map((p) => ({
            pattern_set_id: patternSet.id,
            question_number: p.question_number,
            question_type: p.question_type,
            prompt_style: p.prompt_style,
            choice_style: p.choice_style,
            answer_basis_type: p.answer_basis_type,
            wrong_choice_pattern: p.wrong_choice_pattern,
            difficulty: p.difficulty,
            intent: p.intent,
            uses_reference_box: p.uses_reference_box,
            pattern_summary: p.pattern_summary,
          }))
        );
      if (patternsError) throw patternsError;
    }

    return NextResponse.json({ id: patternSet.id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "저장 실패" }, { status: 500 });
  }
}
