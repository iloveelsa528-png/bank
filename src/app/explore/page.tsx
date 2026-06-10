"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import AuthUserMenu from "@/components/AuthUserMenu";

const AREAS = ["전체", "문학", "독서", "문법", "화작"];

const AREA_BADGE: Record<string, string> = {
  문학: "bg-purple-100 text-purple-700",
  독서: "bg-blue-100 text-blue-700",
  문법: "bg-green-100 text-green-700",
  화작: "bg-orange-100 text-orange-700",
};

const VIS_BADGE: Record<string, { label: string; cls: string }> = {
  public:    { label: "전체 공개", cls: "bg-green-100 text-green-700" },
  neighbors: { label: "👥 서로이웃", cls: "bg-purple-100 text-purple-700" },
  link_only: { label: "링크 공개", cls: "bg-yellow-100 text-yellow-700" },
};

interface ExploreSet {
  id: string;
  user_id: string;
  title: string;
  area: string;
  visibility: string;
  share_token: string;
  created_at: string;
  question_count: number;
  owner_profile: { display_name: string } | null;
}

function ExplorePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sets, setSets] = useState<ExploreSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [area, setArea] = useState(searchParams.get("area") ?? "전체");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchSets = useCallback(async (
    currentArea: string,
    currentSearch: string,
    currentPage: number,
    append = false,
  ) => {
    if (currentPage === 1) setLoading(true);
    else setLoadingMore(true);

    const params = new URLSearchParams();
    if (currentArea && currentArea !== "전체") params.set("area", currentArea);
    if (currentSearch.trim()) params.set("search", currentSearch.trim());
    params.set("page", String(currentPage));

    try {
      const res = await fetch(`/api/explore?${params}`);
      const data = await res.json();
      if (append) {
        setSets(prev => [...prev, ...(data.sets ?? [])]);
      } else {
        setSets(data.sets ?? []);
      }
      setHasMore(data.hasMore ?? false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // area / search 변경 시 초기화 + 재조회
  useEffect(() => {
    setPage(1);
    fetchSets(area, search, 1, false);
    // URL sync
    const p = new URLSearchParams();
    if (area && area !== "전체") p.set("area", area);
    if (search.trim()) p.set("search", search.trim());
    router.replace(`/explore?${p}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchSets(area, search, 1, false);
    const p = new URLSearchParams();
    if (area && area !== "전체") p.set("area", area);
    if (search.trim()) p.set("search", search.trim());
    router.replace(`/explore?${p}`, { scroll: false });
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchSets(area, search, next, true);
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            홈
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">자료 탐색</h1>
            <p className="text-xs text-gray-500 -mt-0.5">다른 선생님의 공유 문제 세트</p>
          </div>
          <div className="ml-auto">
            <AuthUserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-5">
        {/* 검색 + 필터 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
          {/* 검색창 */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="문제 세트 제목으로 검색…"
              className="flex-1 text-sm border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              검색
            </button>
          </form>

          {/* 영역 필터 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium mr-1">영역</span>
            {AREAS.map(a => (
              <button
                key={a}
                onClick={() => setArea(a)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  area === a
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* 결과 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="w-8 h-8 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : sets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">
              {search || area !== "전체"
                ? "검색 결과가 없습니다."
                : "공유된 자료가 아직 없습니다."}
            </p>
            {(search || area !== "전체") && (
              <button
                onClick={() => { setSearch(""); setArea("전체"); }}
                className="text-sm text-blue-600 hover:underline"
              >
                전체 보기
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500">{sets.length}개 결과</p>
            <div className="flex flex-col gap-3">
              {sets.map(s => (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-all"
                >
                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {s.area && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${AREA_BADGE[s.area] ?? "bg-gray-100 text-gray-600"}`}>
                          {s.area}
                        </span>
                      )}
                      {VIS_BADGE[s.visibility] && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${VIS_BADGE[s.visibility].cls}`}>
                          {VIS_BADGE[s.visibility].label}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 leading-snug">{s.title}</h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {s.owner_profile ? (
                        <Link
                          href={`/profile/${s.user_id}`}
                          className="text-xs text-green-600 hover:underline font-medium"
                        >
                          {s.owner_profile.display_name}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">익명</span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(s.created_at).toLocaleDateString("ko-KR")}
                      </span>
                      <span className="text-xs text-purple-600 font-medium">
                        {s.question_count}문항
                      </span>
                    </div>
                  </div>

                  {/* 버튼 */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => copyLink(s.share_token)}
                      title="링크 복사"
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      {copied === s.share_token ? "복사됨!" : "링크 복사"}
                    </button>
                    <Link
                      href={`/share/${s.share_token}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
                    >
                      보기 →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* 더 보기 */}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {loadingMore ? "불러오는 중…" : "더 보기"}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <ExplorePageInner />
    </Suspense>
  );
}
