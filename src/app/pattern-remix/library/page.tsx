"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ExamPatternSet } from "@/types/patterns";

const AREA_BADGE: Record<string, string> = {
  문학: "bg-purple-100 text-purple-700",
  독서: "bg-blue-100 text-blue-700",
  문법: "bg-green-100 text-green-700",
  화작: "bg-orange-100 text-orange-700",
  기타: "bg-gray-100 text-gray-600",
};

const QTYPE_COLOR: Record<string, string> = {
  내용이해: "bg-blue-50 text-blue-600 border-blue-200",
  추론: "bg-indigo-50 text-indigo-600 border-indigo-200",
  표현분석: "bg-purple-50 text-purple-600 border-purple-200",
  어휘문법: "bg-pink-50 text-pink-600 border-pink-200",
  비판적사고: "bg-orange-50 text-orange-600 border-orange-200",
  적용: "bg-cyan-50 text-cyan-600 border-cyan-200",
  서술형: "bg-gray-50 text-gray-600 border-gray-200",
};

function Spinner() {
  return (
    <svg className="w-8 h-8 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-semibold text-gray-500 mb-0.5">{label}</p>
      <p className="text-gray-700 leading-relaxed">{value}</p>
    </div>
  );
}

export default function PatternLibraryPage() {
  const [patternSets, setPatternSets] = useState<ExamPatternSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("전체");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");

  useEffect(() => {
    fetch("/api/pattern-sets")
      .then((r) => r.json())
      .then((d) => setPatternSets(d.patternSets ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("이 패턴 세트를 삭제하시겠습니까?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/pattern-sets/${id}`, { method: "DELETE" });
      setPatternSets((prev) => prev.filter((p) => p.id !== id));
      if (expanded === id) setExpanded(null);
    } finally {
      setDeleting(null);
    }
  };

  const areas = useMemo(() => {
    const a = new Set(patternSets.map((ps) => ps.area).filter(Boolean));
    return a.size > 0 ? ["전체", ...Array.from(a)] : [];
  }, [patternSets]);

  const filtered = useMemo(() => {
    let list = patternSets;
    if (areaFilter !== "전체") list = list.filter((ps) => ps.area === areaFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (ps) =>
          ps.title.toLowerCase().includes(q) ||
          ps.school_name.toLowerCase().includes(q) ||
          (ps.grade ?? "").toLowerCase().includes(q) ||
          (ps.exam_name ?? "").toLowerCase().includes(q) ||
          (ps.description ?? "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === "oldest") return a.created_at.localeCompare(b.created_at);
      if (sortBy === "name") return a.title.localeCompare(b.title, "ko");
      return b.created_at.localeCompare(a.created_at);
    });
  }, [patternSets, search, areaFilter, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/pattern-remix" className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">패턴 라이브러리</h1>
            <p className="text-xs text-gray-500 -mt-0.5">저장된 기출 패턴 세트 목록</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/pattern-remix"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              새 패턴 추출
            </Link>
            <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              홈
            </Link>
          </div>
        </div>

        {/* 검색 + 필터 바 */}
        {!loading && patternSets.length > 0 && (
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
                  placeholder="이름, 학교, 학년, 시험 검색…"
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
                        {patternSets.filter((ps) => ps.area === a).length}
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
          <div className="flex items-center justify-center py-20"><Spinner /></div>
        ) : patternSets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">저장된 패턴 세트가 없습니다.</p>
            <Link href="/pattern-remix" className="text-sm text-green-600 hover:underline">첫 번째 패턴 추출하기</Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {filtered.length === patternSets.length
                  ? `${patternSets.length}개 패턴 세트`
                  : `${filtered.length} / ${patternSets.length}개`}
              </p>
              {search && filtered.length === 0 && (
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
            ) : filtered.map((ps) => {
              const types = ps.exam_patterns
                ? [...new Set(ps.exam_patterns.map((ep) => ep.question_type))]
                : [];
              const diffCount = { 기본: 0, 응용: 0, 고난도: 0 };
              ps.exam_patterns?.forEach((ep) => {
                if (ep.difficulty in diffCount) diffCount[ep.difficulty as keyof typeof diffCount]++;
              });

              return (
                <div key={ps.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {ps.area && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${AREA_BADGE[ps.area] ?? "bg-gray-100 text-gray-600"}`}>
                            {ps.area}
                          </span>
                        )}
                        {ps.grade && <span className="text-xs text-gray-500">{ps.grade}</span>}
                        {ps.semester && <span className="text-xs text-gray-500">{ps.semester}</span>}
                        {ps.exam_name && <span className="text-xs text-gray-500">{ps.exam_name}</span>}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">{ps.title}</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        {ps.school_name && <span className="text-xs text-gray-500">{ps.school_name}</span>}
                        <span className="text-xs text-gray-400">{new Date(ps.created_at).toLocaleDateString("ko-KR")}</span>
                        {ps.exam_patterns && (
                          <span className="text-xs text-green-600 font-medium">{ps.exam_patterns.length}문항 패턴</span>
                        )}
                      </div>
                      {ps.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{ps.description}</p>}

                      {/* 문항 유형 미리보기 */}
                      {types.length > 0 && (
                        <div className="mt-2.5 space-y-1.5">
                          <div className="flex flex-wrap gap-1">
                            {types.slice(0, 6).map((t) => (
                              <span
                                key={t}
                                className={`text-[11px] px-1.5 py-0.5 rounded border font-medium ${QTYPE_COLOR[t] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2 text-[11px]">
                            {diffCount.기본 > 0 && <span className="text-green-600">기본 {diffCount.기본}문항</span>}
                            {diffCount.응용 > 0 && <span className="text-amber-600">응용 {diffCount.응용}문항</span>}
                            {diffCount.고난도 > 0 && <span className="text-red-600">고난도 {diffCount.고난도}문항</span>}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                      <Link
                        href={`/pattern-remix/generate?pattern=${ps.id}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors">
                        문제 생성 →
                      </Link>
                      <button
                        onClick={() => setExpanded((v) => v === ps.id ? null : ps.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 transition-colors">
                        {expanded === ps.id ? "닫기" : "상세 보기"}
                      </button>
                      <button
                        onClick={() => handleDelete(ps.id)}
                        disabled={deleting === ps.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50">
                        {deleting === ps.id ? "삭제 중…" : "삭제"}
                      </button>
                    </div>
                  </div>

                  {expanded === ps.id && ps.exam_patterns && ps.exam_patterns.length > 0 && (
                    <div className="border-t border-gray-100 px-5 py-4 flex flex-col gap-3">
                      {ps.exam_patterns.map((p) => (
                        <div key={p.id} className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">{p.question_number}</span>
                            <span className="text-sm font-semibold text-gray-800">{p.question_number}번</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${QTYPE_COLOR[p.question_type] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                              {p.question_type}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              p.difficulty === "기본" ? "bg-green-100 text-green-700" :
                              p.difficulty === "응용" ? "bg-orange-100 text-orange-700" :
                              "bg-red-100 text-red-700"
                            }`}>{p.difficulty}</span>
                            {p.uses_reference_box && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">보기</span>}
                          </div>
                          <div className="bg-white border border-green-100 rounded-lg px-3 py-2">
                            <p className="text-xs font-semibold text-green-600 mb-0.5">패턴 요약</p>
                            <p className="text-xs text-gray-700 leading-relaxed">{p.pattern_summary}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <InfoRow label="발문 방식" value={p.prompt_style} />
                            <InfoRow label="선택지 구성" value={p.choice_style} />
                            <InfoRow label="정답 근거" value={p.answer_basis_type} />
                            <InfoRow label="오답 패턴" value={p.wrong_choice_pattern} />
                          </div>
                        </div>
                      ))}
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
