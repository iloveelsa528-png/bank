"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import UserMenu from "./UserMenu";

export default function AuthUserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getUser().then((res: { data: { user: User | null } }) => {
      const user = res.data?.user;
      if (user) {
        setEmail(user.email ?? null);
        setAvatarUrl(user.user_metadata?.avatar_url);
        fetch("/api/neighbors?pending_count=true")
          .then(r => r.json())
          .then(d => setPendingCount(d.count ?? 0))
          .catch(() => {});
      }
    });
  }, []);

  if (!email) return null;
  return <UserMenu email={email} avatarUrl={avatarUrl} pendingNeighborCount={pendingCount} />;
}
