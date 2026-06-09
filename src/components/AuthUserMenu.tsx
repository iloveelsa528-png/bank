"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import UserMenu from "./UserMenu";

export default function AuthUserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email ?? null);
        setAvatarUrl(user.user_metadata?.avatar_url);
      }
    });
  }, []);

  if (!email) return null;
  return <UserMenu email={email} avatarUrl={avatarUrl} />;
}
