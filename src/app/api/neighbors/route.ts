import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  // 경량 pending count 조회
  if (request.nextUrl.searchParams.get("pending_count") === "true") {
    const { count } = await supabase
      .from("neighbor_requests")
      .select("id", { count: "exact", head: true })
      .eq("target_id", user.id)
      .eq("status", "pending");
    return NextResponse.json({ count: count ?? 0 });
  }

  // 내가 관련된 요청 전체 조회
  const { data: requests, error } = await supabase
    .from("neighbor_requests")
    .select("*")
    .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!requests || requests.length === 0) {
    return NextResponse.json({ received: [], sent: [], approved: [], myId: user.id });
  }

  // 관련 유저 ID 수집 → user_profiles 일괄 조회
  const userIds = [...new Set(requests.flatMap(r => [r.requester_id, r.target_id]))];
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, display_name")
    .in("id", userIds);

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

  const enriched = requests.map(r => ({
    ...r,
    requester_profile: profileMap[r.requester_id] ?? null,
    target_profile: profileMap[r.target_id] ?? null,
  }));

  return NextResponse.json({
    received: enriched.filter(r => r.target_id === user.id && r.status === "pending"),
    sent: enriched.filter(r => r.requester_id === user.id && r.status === "pending"),
    approved: enriched.filter(r => r.status === "approved"),
    myId: user.id,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { target_id } = await request.json();
  if (!target_id || target_id === user.id) {
    return NextResponse.json({ error: "유효하지 않은 대상입니다." }, { status: 400 });
  }

  // 내 프로필 자동 생성 (email 포함)
  await supabase.from("user_profiles").upsert(
    { id: user.id, display_name: user.email?.split("@")[0] ?? user.id.slice(0, 8), email: user.email ?? null },
    { onConflict: "id" }
  );

  const { error } = await supabase.from("neighbor_requests").insert({
    requester_id: user.id,
    target_id,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 신청하셨습니다." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
