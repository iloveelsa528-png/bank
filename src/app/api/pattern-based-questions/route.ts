import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { PatternBasedQuestion } from "@/types/pattern-remix";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { data, error } = await supabase
      .from("pattern_based_questions")
      .select(`
        *,
        exam_pattern_sets(title, school_name, grade),
        source_passages(title, area)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ questionSets: data ?? [] });
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
    const {
      title, pattern_set_id, source_passage_id,
      generated_questions, difficulty, area,
    }: {
      title: string;
      pattern_set_id: string;
      source_passage_id: string;
      generated_questions: PatternBasedQuestion[];
      difficulty: string;
      area: string;
    } = body;

    if (!title?.trim()) return NextResponse.json({ error: "제목을 입력하세요." }, { status: 400 });

    const { data, error } = await supabase
      .from("pattern_based_questions")
      .insert({
        user_id: user.id,
        title: title.trim(),
        pattern_set_id,
        source_passage_id,
        generated_questions: generated_questions ?? [],
        difficulty: difficulty ?? "",
        area: area ?? "",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "저장 실패" }, { status: 500 });
  }
}
