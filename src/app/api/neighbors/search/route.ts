import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email || email.length < 3) {
    return NextResponse.json({ error: "이메일을 3자 이상 입력해주세요." }, { status: 400 });
  }

  // user_profiles에서 이메일로 검색 (자기 자신 제외)
  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("id, display_name, email")
    .ilike("email", `%${email}%`)
    .neq("id", user.id)
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // 기존 이웃 관계 확인
  const targetIds = profiles.map(p => p.id);
  const { data: existingReqs } = await supabase
    .from("neighbor_requests")
    .select("id, requester_id, target_id, status")
    .or(
      targetIds.map(id =>
        `and(requester_id.eq.${user.id},target_id.eq.${id}),and(requester_id.eq.${id},target_id.eq.${user.id})`
      ).join(",")
    );

  const relMap: Record<string, { reqId: string; status: string; direction: "sent" | "received" }> = {};
  for (const req of existingReqs ?? []) {
    const otherId = req.requester_id === user.id ? req.target_id : req.requester_id;
    relMap[otherId] = {
      reqId: req.id,
      status: req.status,
      direction: req.requester_id === user.id ? "sent" : "received",
    };
  }

  const results = profiles.map(p => ({
    id: p.id,
    display_name: p.display_name,
    email: p.email,
    relationship: relMap[p.id] ?? null,
  }));

  return NextResponse.json({ results });
}
