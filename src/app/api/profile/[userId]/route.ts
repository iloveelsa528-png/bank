import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  // 프로필 조회
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, created_at")
    .eq("id", userId)
    .single();

  // 나와의 관계 조회
  const { data: rel } = await supabase
    .from("neighbor_requests")
    .select("id, status, requester_id")
    .or(`and(requester_id.eq.${user.id},target_id.eq.${userId}),and(requester_id.eq.${userId},target_id.eq.${user.id})`)
    .maybeSingle();

  let relationship: "none" | "pending_sent" | "pending_received" | "neighbor" = "none";
  if (rel) {
    if (rel.status === "approved") relationship = "neighbor";
    else if (rel.status === "pending") {
      relationship = rel.requester_id === user.id ? "pending_sent" : "pending_received";
    }
  }

  // 공개 문제 세트 조회 (내 문제 제외, 공개/서로이웃 문제만)
  const visibilityFilter = relationship === "neighbor"
    ? ["public", "neighbors"]
    : ["public"];

  const { data: questionSets } = await supabase
    .from("pattern_based_questions")
    .select("id, title, area, created_at, visibility, generated_questions")
    .eq("user_id", userId)
    .in("visibility", visibilityFilter)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    profile: profile ?? { display_name: null },
    relationship,
    relationshipId: rel?.id ?? null,
    questionSets: questionSets ?? [],
    myId: user.id,
    targetId: userId,
  });
}
