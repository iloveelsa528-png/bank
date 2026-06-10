"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";

const HIDE_NAV_ON = ["/login", "/auth", "/share"];

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = !HIDE_NAV_ON.some(p => pathname.startsWith(p));

  return (
    <>
      <div className={showNav ? "pb-16" : ""}>{children}</div>
      {showNav && <BottomNav />}
    </>
  );
}
