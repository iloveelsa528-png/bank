"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { SourcePassage } from "@/types/passages";

const AREA_BADGE: Record<string, string> = {
  문학: "bg-purple-100 text-purple-700",
  독서: "bg-blue-100 text-blue-700",
  문법: "bg-green-100 text-green-700",
  화작: "bg-orange-100 text-orange-700",
};

const SOURCE_BADGE: Record<string, string> = {
  교과서:   "bg-gray-100 text-gray-600",
  문학작품: "bg-pink-100 text-pink-700",
  독서지문: "bg-sky-100 text-sky-700",
  학교자료: "bg-amber-100 text-amber-700",
  직접입력: "bg-slate-100 text-slate-600",
};

const QTYPE_BADGE: Record<string, string> = {
  내용이해:   "bg-blue-100 text-blue-700",
  추론:       "bg-purple-100 text-purple-700",
  표현분석:   "bg-pink-100 text-pink-700",
  어휘문법:   "bg-green-100 text-green-700",
  비판적사고: "bg-orange-100 text-orange-700",
  적용:       "bg-cyan-100 text-cyan-700",
};

export default function PassageLibraryPage() {
  const [passages, setPassages] = useState<SourcePassage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("전체");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");

  useEffect(() => {
    fetch("/api/source-passages")
      .then((r) => r.json())
      .then((d) => setPassages(d.passages ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("이 지문을 삭제하시겠습니까?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/source-passages/${id}`, { method: "DELETE" });
      setPassages((prev) => prev.filter((p) => p.id !== id));
      if (expanded === id) setExpanded(null);
    } finally {
      setDeleting(null);
    }
  };

  const areas = useMemo(() => {
    const a = new Set(passages.map((p) => p.area).filter(Boolean));
    return a.size > 0 ? ["전체", ...Array.from(a)] : [];
  }, [passages]);

  const filtered = useMemo(() => {
    let list = passages;
    if (areaFilter !== "전체") list = list.filter((p) => p.area === areaFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.analysis_summary ?? "").toLowerCase().includes(q) ||
          (p.key_points ?? "").toLowerCase().includes(q) ||
          (p.passage_text ?? "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === "oldest") return a.created_at.localeCompare(b.created_at);
      if (sortBy === "name") return a.title.localeCompare(b.title, "ko");
      return b.created_at.localeCompare(a.created_at);
    });
  }, [passages, search, areaFilter, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/source-passages"
            className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">지문 라이브러리</h1>
            <p className="text-xs text-gray-500 -mt-0.5">저장된 지문 목록</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/source-passages"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              새 지문 등록
            </Link>
            <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              홈
            </Link>
          </div>
        </div>

        {/* 검색 + 필터 바 */}
        {!loading && passages.length > 0 && (
          <div className="max-w-5xl mx-auto px-6 pb-3 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="제목, 내용으로 검색…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 focus:bg-white"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 focus:outline-none focus:border-green-400"
              >
                <option value="newest">최신순</option>
                <option value="oldest">오래된순</option>
                <option value="name">이름순</option>
              </select>
            </div>
            {areas.length > 2 && (
              <div className="flex gap-1.5 flex-wrap">
                {areas.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAreaFilter(a)}
                    className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                      areaFilter === a
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {a}
                    {a !== "전체" && (
                      <span className="ml-1 opacity-70">
                        {passages.filter((p) => p.area === a).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="w-8 h-8 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : passages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">저장된 지문이 없습니다.</p>
            <Link href="/source-passages" className="text-sm text-green-600 hover:underline">
              첫 번째 지문 등록하기
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {filtered.length === passages.length
                  ? `${passages.length}개 지문`
                  : `${filtered.length} / ${passages.length}개`}
              </p>
              {(search || areaFilter !== "전체") && filtered.length === 0 && (
                <button onClick={() => { setSearch(""); setAreaFilter("전체"); }} className="text-xs text-green-600 hover:underline">
                  필터 초기화
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-12 text-center">
                <p className="text-sm text-gray-400">검색 결과가 없습니다</p>
                <button onClick={() => { setSearch(""); setAreaFilter("전체"); }} className="text-xs text-green-600 hover:underline mt-2">
                  필터 초기화
                </button>
              </div>
            ) : filtered.map((p) => {
              const firstLine = p.passage_text?.trim().split("\n").find((l) => l.trim()) ?? "";
              const charCount = p.passage_text?.length ?? 0;

              return (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {p.area && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${AREA_BADGE[p.area] ?? "bg-gray-100 text-gray-600"}`}>
                            {p.area}
                          </span>
                        )}
                        {p.source_type && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_BADGE[p.source_type] ?? "bg-gray-100 text-gray-600"}`}>
                            {p.source_type}
                          </span>
                        )}
                        {charCount > 0 && (
                          <span className="text-xs text-gray-400">{charCount.toLocaleString()}자</span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">{p.title}</h3>
                      <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString("ko-KR")}</span>

                      {/* 분석 요약 */}
                      {p.analysis_summary && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{p.analysis_summary}</p>
                      )}

                      {/* 지문 첫줄 미리보기 */}
                      {firstLine && (
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-1 italic">
                          &ldquo;{firstLine.slice(0, 80)}{firstLine.length > 80 ? "…" : ""}&rdquo;
                        </p>
                      )}

                      {/* 출제 요소 뱃지 */}
                      {p.candidate_question_points?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {[...new Set(p.candidate_question_points.map((pt) => pt.question_type))]
                            .slice(0, 5)
                            .map((t) => (
                              <span
                                key={t}
                                className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${QTYPE_BADGE[t] ?? "bg-gray-100 text-gray-600"}`}
                              >
                                {t}
                              </span>
                            ))}
                          <span className="text-[11px] text-gray-400 ml-0.5">출제 요소 {p.candidate_question_points.length}개</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                      <Link
                        href={`/pattern-remix/generate?passage=${p.id}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors">
                        문제 생성 →
                      </Link>
                      <button
                        onClick={() => setExpanded((v) => v === p.id ? null : p.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 transition-colors">
                        {expanded === p.id ? "닫기" : "전문 보기"}
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deleting === p.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50">
                        {deleting === p.id ? "삭제 중…" : "삭제"}
                      </button>
                    </div>
                  </div>

                  {expanded === p.id && (
                    <div className="border-t border-gray-100 px-5 py-4 flex flex-col gap-4">
                      {p.image_urls?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">원본 이미지 ({p.image_urls.length}장)</p>
                          <div className="flex flex-wrap gap-3">
                            {p.image_urls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={url}
                                  alt={`지문 이미지 ${i + 1}`}
                                  className="max-h-64 rounded-lg border border-gray-200 object-contain hover:shadow-md transition-shadow cursor-zoom-in"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {p.passage_text && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">지문 전문</p>
                          <div className="bg-gray-50 rounded-xl p-3 max-h-60 overflow-y-auto">
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{p.passage_text}</p>
                          </div>
                        </div>
                      )}

                      {p.key_points && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">핵심 내용</p>
                          <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                            <p className="text-xs text-green-800 leading-relaxed whitespace-pre-wrap">{p.key_points}</p>
                          </div>
                        </div>
                      )}

                      {p.candidate_question_points?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">출제 가능 요소</p>
                          <div className="flex flex-col gap-2">
                            {p.candidate_question_points.map((pt, i) => (
                              <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                    {i + 1}
                                  </span>
                                  <span className="text-xs font-semibold text-gray-800">{pt.element}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${QTYPE_BADGE[pt.question_type] ?? "bg-gray-100 text-gray-600"}`}>
                                    {pt.question_type}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed pl-7">{pt.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}
