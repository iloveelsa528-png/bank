import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = request.nextUrl;
    const area = searchParams.get("area") ?? "";
    const search = searchParams.get("search") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = 20;
    const from = (page - 1) * pageSize;

    // public 세트 조회
    let query = supabase
      .from("pattern_based_questions")
      .select("id, user_id, title, area, visibility, share_token, created_at, generated_questions")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (area) query = query.eq("area", area);
    if (search) query = query.ilike("title", `%${search}%`);

    const { data: publicSets, error: pubErr } = await query;
    if (pubErr) throw pubErr;

    let neighborSets: typeof publicSets = [];

    // 로그인 상태면 서로이웃 공유 세트도 조회
    if (user) {
      const { data: neighborReqs } = await supabase
        .from("neighbor_requests")
        .select("requester_id, target_id")
        .eq("status", "approved")
        .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`);

      if (neighborReqs && neighborReqs.length > 0) {
        const neighborIds = neighborReqs.map(r =>
          r.requester_id === user.id ? r.target_id : r.requester_id
        );

        let nq = supabase
          .from("pattern_based_questions")
          .select("id, user_id, title, area, visibility, share_token, created_at, generated_questions")
          .eq("visibility", "neighbors")
          .in("user_id", neighborIds)
          .order("created_at", { ascending: false })
          .range(0, 19);

        if (area) nq = nq.eq("area", area);
        if (search) nq = nq.ilike("title", `%${search}%`);

        const { data: ns } = await nq;
        neighborSets = ns ?? [];
      }
    }

    // 모든 세트 합치기 (중복 제거)
    const allSets = [...(publicSets ?? []), ...neighborSets];
    const seen = new Set<string>();
    const dedupedSets = allSets.filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    // 작성자 프로필 수동 조인
    const ownerIds = [...new Set(dedupedSets.map(s => s.user_id))];
    let profileMap: Record<string, { display_name: string }> = {};
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, display_name")
        .in("id", ownerIds);
      profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
    }

    const enriched = dedupedSets.map(s => ({
      ...s,
      question_count: Array.isArray(s.generated_questions) ? s.generated_questions.length : 0,
      generated_questions: undefined, // 목록에서 전체 문제 데이터 제외
      owner_profile: profileMap[s.user_id] ?? null,
    }));

    return NextResponse.json({ sets: enriched, page, hasMore: (publicSets ?? []).length === pageSize });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "조회 실패" }, { status: 500 });
  }
}
