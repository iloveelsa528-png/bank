import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

// PUT: approve / reject
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { action } = await request.json() as { action: "approve" | "reject" };
  const status = action === "approve" ? "approved" : "rejected";

  // 승인 시 내 프로필도 자동 생성 (email 포함)
  if (action === "approve") {
    await supabase.from("user_profiles").upsert(
      { id: user.id, display_name: user.email?.split("@")[0] ?? user.id.slice(0, 8), email: user.email ?? null },
      { onConflict: "id" }
    );
  }

  const { error } = await supabase
    .from("neighbor_requests")
    .update({ status })
    .eq("id", id)
    .eq("target_id", user.id); // 수신자만 승인/거절 가능

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE: 요청 취소 또는 서로이웃 끊기
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { error } = await supabase
    .from("neighbor_requests")
    .delete()
    .eq("id", id)
    .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
