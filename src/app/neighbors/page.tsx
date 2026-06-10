"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AuthUserMenu from "@/components/AuthUserMenu";

interface NeighborRequest {
  id: string;
  requester_id: string;
  target_id: string;
  status: string;
  created_at: string;
  requester_profile?: { display_name: string | null } | null;
  target_profile?: { display_name: string | null } | null;
}

function displayName(profile: { display_name: string | null } | null | undefined, fallbackId: string) {
  return profile?.display_name ?? fallbackId.slice(0, 8) + "…";
}

export default function NeighborsPage() {
  const [received, setReceived] = useState<NeighborRequest[]>([]);
  const [sent, setSent] = useState<NeighborRequest[]>([]);
  const [approved, setApproved] = useState<NeighborRequest[]>([]);
  const [myId, setMyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await fetch("/api/neighbors").then(r => r.json());
    setReceived(d.received ?? []);
    setSent(d.sent ?? []);
    setApproved(d.approved ?? []);
    setMyId(d.myId ?? "");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function respond(id: string, action: "approve" | "reject") {
    setActing(id);
    await fetch(`/api/neighbors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
    setActing(null);
  }

  async function remove(id: string) {
    if (!confirm("서로이웃 관계를 끊으시겠습니까?")) return;
    setActing(id);
    await fetch(`/api/neighbors/${id}`, { method: "DELETE" });
    await load();
    setActing(null);
  }

  async function cancel(id: string) {
    setActing(id);
    await fetch(`/api/neighbors/${id}`, { method: "DELETE" });
    await load();
    setActing(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  const profileUrl = myId ? `${typeof window !== "undefined" ? window.location.origin : ""}/profile/${myId}` : "";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 홈</Link>
          <h1 className="text-xl font-bold text-gray-900">서로이웃 관리</h1>
        </div>
        <AuthUserMenu />
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {/* 내 프로필 링크 */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">내 프로필 링크</h2>
          <p className="text-xs text-gray-500 mb-3">
            이 링크를 상대방에게 공유하면, 상대방이 서로이웃 신청을 보낼 수 있습니다.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={profileUrl}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600 truncate"
            />
            <button
              onClick={() => { navigator.clipboard.writeText(profileUrl); }}
              className="shrink-0 text-xs px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
            >
              복사
            </button>
          </div>
        </section>

        {/* 받은 신청 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            받은 신청
            {received.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {received.length}
              </span>
            )}
          </h2>
          {received.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 p-6 text-center text-gray-400 text-sm">
              받은 신청이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {received.map(r => (
                <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {displayName(r.requester_profile, r.requester_id)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString("ko-KR")} 신청
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => respond(r.id, "approve")}
                      disabled={acting === r.id}
                      className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 transition font-medium"
                    >
                      {acting === r.id ? "처리 중…" : "수락"}
                    </button>
                    <button
                      onClick={() => respond(r.id, "reject")}
                      disabled={acting === r.id}
                      className="text-xs px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 내 서로이웃 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            내 서로이웃 <span className="text-gray-400 font-normal">({approved.length}명)</span>
          </h2>
          {approved.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 p-6 text-center text-gray-400 text-sm">
              아직 서로이웃이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {approved.map(r => {
                const neighborId = r.requester_id === myId ? r.target_id : r.requester_id;
                const neighborProfile = r.requester_id === myId ? r.target_profile : r.requester_profile;
                return (
                  <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {displayName(neighborProfile, neighborId)}
                      </p>
                      <Link
                        href={`/profile/${neighborId}`}
                        className="text-xs text-purple-600 hover:underline"
                      >
                        프로필 보기
                      </Link>
                    </div>
                    <button
                      onClick={() => remove(r.id)}
                      disabled={acting === r.id}
                      className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-40 transition shrink-0"
                    >
                      {acting === r.id ? "처리 중…" : "끊기"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 보낸 신청 */}
        {sent.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">보낸 신청 (승인 대기 중)</h2>
            <div className="space-y-2">
              {sent.map(r => (
                <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3 opacity-70">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {displayName(r.target_profile, r.target_id)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">승인 대기 중</p>
                  </div>
                  <button
                    onClick={() => cancel(r.id)}
                    disabled={acting === r.id}
                    className="text-xs px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition shrink-0"
                  >
                    {acting === r.id ? "취소 중…" : "신청 취소"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
