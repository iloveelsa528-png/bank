import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  await supabase.from("user_profiles").upsert(
    {
      id: user.id,
      display_name: user.email?.split("@")[0] ?? user.id.slice(0, 8),
      email: user.email ?? null,
    },
    { onConflict: "id" }
  );

  return NextResponse.json({ ok: true });
}
