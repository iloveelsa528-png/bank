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

interface SearchResult {
  id: string;
  display_name: string | null;
  email: string | null;
  relationship: { reqId: string; status: string; direction: "sent" | "received" } | null;
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

  // 이메일 검색
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchError, setSearchError] = useState("");
  const [sendingTo, setSendingTo] = useState<string | null>(null);

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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    setSearching(true);
    setSearchError("");
    setSearchResults(null);
    const r = await fetch(`/api/neighbors/search?email=${encodeURIComponent(searchEmail.trim())}`);
    const d = await r.json();
    if (!r.ok) { setSearchError(d.error ?? "검색 실패"); }
    else { setSearchResults(d.results ?? []); }
    setSearching(false);
  }

  async function sendRequest(targetId: string) {
    setSendingTo(targetId);
    const r = await fetch("/api/neighbors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_id: targetId }),
    });
    const d = await r.json();
    if (!r.ok) { alert(d.error ?? "오류 발생"); }
    else {
      // 검색 결과 즉시 업데이트
      setSearchResults(prev => prev?.map(p =>
        p.id === targetId
          ? { ...p, relationship: { reqId: "", status: "pending", direction: "sent" } }
          : p
      ) ?? null);
      await load();
    }
    setSendingTo(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  const profileUrl = myId ? `${typeof window !== "undefined" ? window.location.origin : ""}/profile/${myId}` : "";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 홈</Link>
          <h1 className="text-base font-bold text-gray-900">서로이웃 관리</h1>
        </div>
        <AuthUserMenu />
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* 이메일로 이웃 찾기 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-1">이메일로 이웃 찾기</h2>
          <p className="text-xs text-gray-500 mb-3">상대방 이메일 주소로 검색하여 이웃 신청을 보낼 수 있습니다.</p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="email"
              value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="flex-1 text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
            <button
              type="submit"
              disabled={searching || !searchEmail.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shrink-0"
            >
              {searching ? "검색 중…" : "검색"}
            </button>
          </form>

          {/* 검색 결과 */}
          {searchError && (
            <p className="text-xs text-red-500 mt-2">{searchError}</p>
          )}
          {searchResults !== null && (
            <div className="mt-3 flex flex-col gap-2">
              {searchResults.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">검색 결과가 없습니다. 상대방이 아직 앱을 사용하지 않았거나 이메일이 다를 수 있습니다.</p>
              ) : (
                searchResults.map(result => {
                  const rel = result.relationship;
                  const isNeighbor = rel?.status === "approved";
                  const isPendingSent = rel?.status === "pending" && rel?.direction === "sent";
                  const isPendingReceived = rel?.status === "pending" && rel?.direction === "received";
                  return (
                    <div key={result.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                        {(result.display_name ?? result.email ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {result.display_name ?? "이름 없음"}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{result.email}</p>
                      </div>
                      <div className="shrink-0">
                        {isNeighbor ? (
                          <span className="text-xs text-green-600 font-medium">이웃 ✓</span>
                        ) : isPendingSent ? (
                          <span className="text-xs text-gray-400">신청 중…</span>
                        ) : isPendingReceived ? (
                          <span className="text-xs text-orange-500">신청 받음</span>
                        ) : (
                          <button
                            onClick={() => sendRequest(result.id)}
                            disabled={sendingTo === result.id}
                            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium"
                          >
                            {sendingTo === result.id ? "신청 중…" : "신청"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
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
                      className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 transition font-medium"
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
                        className="text-xs text-green-600 hover:underline"
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

        {/* 내 프로필 링크 (기존 방법) */}
        <section className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
          <h2 className="text-xs font-semibold text-gray-500 mb-1">내 프로필 링크로 공유</h2>
          <p className="text-xs text-gray-400 mb-2">이 링크를 상대방에게 보내면 상대방이 직접 신청할 수도 있습니다.</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={profileUrl}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-500 truncate"
            />
            <button
              onClick={() => { navigator.clipboard.writeText(profileUrl); }}
              className="shrink-0 text-xs px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              복사
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
