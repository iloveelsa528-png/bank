"use client";

import BottomNav from "./BottomNav";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-16">{children}</div>
      <BottomNav />
    </>
  );
}
