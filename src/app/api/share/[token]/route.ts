import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const supabase = await createServerSupabase();

    // 토큰으로 문서 찾기 (visibility 조건 없이 먼저 조회)
    const { data, error } = await supabase
      .from("pattern_based_questions")
      .select(`*, exam_pattern_sets(title, school_name, grade), source_passages(title, area, passage_text, key_points)`)
      .eq("share_token", token)
      .neq("visibility", "private")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "찾을 수 없거나 비공개 문서입니다." }, { status: 404 });
    }

    // 서로이웃 전용 문서는 로그인 + 이웃 관계 확인
    if (data.visibility === "neighbors") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다.", needLogin: true }, { status: 401 });
      }

      // 본인 소유면 허용
      if (data.user_id !== user.id) {
        const { data: rel } = await supabase
          .from("neighbor_requests")
          .select("id")
          .eq("status", "approved")
          .or(`and(requester_id.eq.${user.id},target_id.eq.${data.user_id}),and(requester_id.eq.${data.user_id},target_id.eq.${user.id})`)
          .maybeSingle();

        if (!rel) {
          return NextResponse.json({
            error: "서로이웃만 열람할 수 있습니다.",
            ownerId: data.user_id,
            needNeighbor: true,
          }, { status: 403 });
        }
      }
    }

    return NextResponse.json({ questionSet: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "조회 실패" }, { status: 500 });
  }
}
