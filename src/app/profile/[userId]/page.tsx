"use client";
import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AuthUserMenu from "@/components/AuthUserMenu";

interface ProfileData {
  profile: { display_name: string | null };
  relationship: "none" | "pending_sent" | "pending_received" | "neighbor";
  relationshipId: string | null;
  questionSets: Array<{
    id: string;
    title: string;
    area: string;
    created_at: string;
    visibility: string;
    generated_questions: unknown[];
  }>;
  myId: string;
  targetId: string;
}

const VIS_BADGE: Record<string, string> = {
  public: "🌍 공개",
  neighbors: "👥 서로이웃",
  link_only: "🔗 링크 공유",
};

export default function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [acting, setActing] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/profile/${userId}`);
    const d = await r.json();
    if (!r.ok) { setLoadError(d.error ?? "로드 실패"); setLoading(false); return; }
    setData(d);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function sendRequest() {
    setActing(true);
    const r = await fetch("/api/neighbors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_id: userId }),
    });
    const d = await r.json();
    if (!r.ok) { setActionMsg(d.error ?? "오류 발생"); setActing(false); return; }
    setActionMsg("신청을 보냈습니다!");
    await load();
    setActing(false);
  }

  async function cancelRequest() {
    if (!data?.relationshipId) return;
    setActing(true);
    await fetch(`/api/neighbors/${data.relationshipId}`, { method: "DELETE" });
    setActionMsg("신청을 취소했습니다.");
    await load();
    setActing(false);
  }

  async function acceptRequest() {
    if (!data?.relationshipId) return;
    setActing(true);
    await fetch(`/api/neighbors/${data.relationshipId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    setActionMsg("서로이웃이 되었습니다!");
    await load();
    setActing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 text-gray-500">
        <p>{loadError}</p>
        <Link href="/" className="text-purple-600 hover:underline text-sm">홈으로</Link>
      </div>
    );
  }

  if (!data) return null;

  const displayName = data.profile.display_name ?? userId.slice(0, 8) + "…";
  const isMe = data.myId === userId;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 홈</Link>
          <h1 className="text-xl font-bold text-gray-900">프로필</h1>
        </div>
        <AuthUserMenu />
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-5">
        {/* 프로필 카드 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center text-xl font-bold text-white shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{displayName}</h2>
                {isMe && <p className="text-xs text-purple-600 font-medium mt-0.5">내 프로필</p>}
                {data.relationship === "neighbor" && (
                  <p className="text-xs text-green-600 font-medium mt-0.5">👥 서로이웃</p>
                )}
                {data.relationship === "pending_sent" && (
                  <p className="text-xs text-gray-500 mt-0.5">신청 대기 중…</p>
                )}
                {data.relationship === "pending_received" && (
                  <p className="text-xs text-orange-500 font-medium mt-0.5">이 사용자가 나에게 신청했습니다</p>
                )}
              </div>
            </div>

            {/* 관계 액션 버튼 */}
            {!isMe && (
              <div className="shrink-0">
                {data.relationship === "none" && (
                  <button
                    onClick={sendRequest}
                    disabled={acting}
                    className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg font-medium hover:bg-purple-700 disabled:opacity-40 transition"
                  >
                    {acting ? "처리 중…" : "서로이웃 신청"}
                  </button>
                )}
                {data.relationship === "pending_sent" && (
                  <button
                    onClick={cancelRequest}
                    disabled={acting}
                    className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
                  >
                    {acting ? "처리 중…" : "신청 취소"}
                  </button>
                )}
                {data.relationship === "pending_received" && (
                  <button
                    onClick={acceptRequest}
                    disabled={acting}
                    className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg font-medium hover:bg-purple-700 disabled:opacity-40 transition"
                  >
                    {acting ? "처리 중…" : "수락하기"}
                  </button>
                )}
                {data.relationship === "neighbor" && (
                  <Link
                    href="/neighbors"
                    className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition inline-block"
                  >
                    서로이웃 관리
                  </Link>
                )}
              </div>
            )}
          </div>

          {actionMsg && (
            <p className="mt-3 text-sm text-purple-700 bg-purple-50 rounded-lg px-3 py-2">{actionMsg}</p>
          )}
        </div>

        {/* 공개 문제 세트 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            공개된 문제 세트
            {data.relationship === "neighbor" && (
              <span className="ml-2 text-xs text-green-600 font-normal">(서로이웃 전용 포함)</span>
            )}
          </h3>
          {data.questionSets.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
              공개된 문제 세트가 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {data.questionSets.map(qs => (
                <div key={qs.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{qs.title}</p>
                    <div className="flex gap-2 mt-0.5">
                      {qs.area && <span className="text-xs text-gray-400">{qs.area}</span>}
                      <span className="text-xs text-gray-400">
                        {Array.isArray(qs.generated_questions) ? qs.generated_questions.length : 0}문항
                      </span>
                      <span className="text-xs text-purple-600">{VIS_BADGE[qs.visibility] ?? qs.visibility}</span>
                    </div>
                  </div>
                  <Link
                    href={`/pattern-remix/generate/${qs.id}/edit`}
                    className="shrink-0 text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                  >
                    보기
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
