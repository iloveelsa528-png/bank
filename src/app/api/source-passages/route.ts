import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { CandidateQuestionPoint } from "@/types/passages";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { data, error } = await supabase
      .from("source_passages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ passages: data ?? [] });
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
      title, area, source_type, passage_text, ocr_raw_text,
      analysis_summary, key_points, candidate_question_points, image_urls,
    }: {
      title: string; area: string; source_type: string;
      passage_text: string; ocr_raw_text: string;
      analysis_summary: string; key_points: string;
      candidate_question_points: CandidateQuestionPoint[];
      image_urls: string[];
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "제목을 입력하세요." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("source_passages")
      .insert({
        user_id: user.id,
        title: title.trim(),
        area: area ?? "",
        source_type: source_type ?? "",
        passage_text: passage_text ?? "",
        ocr_raw_text: ocr_raw_text ?? "",
        analysis_summary: analysis_summary ?? "",
        key_points: key_points ?? "",
        candidate_question_points: candidate_question_points ?? [],
        image_urls: image_urls ?? [],
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "저장 실패" }, { status: 500 });
  }
}
