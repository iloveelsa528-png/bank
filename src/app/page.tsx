"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Stats {
  patternSets: number;
  passages: number;
  questionSets: number;
}

const STEPS = [
  {
    num: 1,
    emoji: "📄",
    title: "기출 시험지 넣기",
    desc: "시험지 사진을 올리면 AI가 문항 패턴을 자동 분석합니다",
    href: "/pattern-remix",
    cta: "시험지 올리기",
    getStatus: (s: Stats) => s.patternSets > 0 ? `패턴 ${s.patternSets}개 저장됨` : null,
    emptyHint: "시험지가 아직 없습니다",
  },
  {
    num: 2,
    emoji: "📖",
    title: "새 지문 넣기",
    desc: "출제할 지문을 사진이나 텍스트로 등록합니다",
    href: "/source-passages",
    cta: "지문 등록하기",
    getStatus: (s: Stats) => s.passages > 0 ? `지문 ${s.passages}개 저장됨` : null,
    emptyHint: "지문이 아직 없습니다",
  },
  {
    num: 3,
    emoji: "✨",
    title: "AI로 문제 만들기",
    desc: "기출 패턴 × 새 지문으로 AI가 문항을 자동 생성합니다",
    href: "/pattern-remix/generate",
    cta: "문제 생성하기",
    getStatus: (s: Stats) => s.questionSets > 0 ? `문제 세트 ${s.questionSets}개 저장됨` : null,
    emptyHint: "아직 생성된 문제 없음",
  },
  {
    num: 4,
    emoji: "🖨️",
    title: "수정하고 PDF 저장",
    desc: "생성된 문제를 검토·수정하고 PDF로 인쇄합니다",
    href: "/pattern-remix/generate/library",
    cta: "문제 목록 보기",
    getStatus: (s: Stats) => s.questionSets > 0 ? `${s.questionSets}개 문제 세트` : null,
    emptyHint: "아직 저장된 문제 없음",
  },
];

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/pattern-sets").then(r => r.json()).catch(() => ({})),
      fetch("/api/source-passages").then(r => r.json()).catch(() => ({})),
      fetch("/api/pattern-based-questions").then(r => r.json()).catch(() => ({})),
    ]).then(([ps, sp, pq]) => {
      setStats({
        patternSets:  (ps.patternSets  ?? []).length,
        passages:     (sp.passages     ?? []).length,
        questionSets: (pq.questionSets ?? []).length,
      });
    });
  }, []);

  const isReady = stats !== null;
  const allEmpty = isReady && stats.patternSets === 0 && stats.passages === 0 && stats.questionSets === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-base font-bold text-gray-900">국어 문제은행</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-24 flex flex-col gap-5">

        {/* 시작 안내 배너 (처음 사용할 때만) */}
        {allEmpty && (
          <div className="bg-green-600 rounded-2xl p-5 text-white">
            <p className="text-base font-bold mb-1">처음 오셨나요? 👋</p>
            <p className="text-sm opacity-90 leading-relaxed">
              아래 1단계부터 순서대로 진행하시면 됩니다.
              시험지 사진만 있으면 AI가 나머지를 도와줍니다.
            </p>
          </div>
        )}

        {/* 자료 현황 (데이터 있을 때만) */}
        {isReady && !allEmpty && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">내 자료 현황</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "기출 패턴", value: stats.patternSets, href: "/pattern-remix/library" },
                { label: "지문", value: stats.passages, href: "/source-passages/library" },
                { label: "문제 세트", value: stats.questionSets, href: "/pattern-remix/generate/library" },
              ].map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="bg-gray-50 hover:bg-green-50 rounded-xl px-3 py-3 text-center transition-colors group"
                >
                  <p className="text-2xl font-bold text-gray-900 group-hover:text-green-700">{item.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 4단계 흐름 */}
        <div>
          <p className="text-sm font-bold text-gray-800 mb-3">
            {allEmpty ? "문제지 만드는 방법 — 4단계" : "문제지 만들기"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {STEPS.map((step) => {
              const status = isReady ? step.getStatus(stats!) : null;
              const done = !!status;
              return (
                <Link
                  key={step.num}
                  href={step.href}
                  className={`relative bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-2 transition-all hover:shadow-md active:scale-[0.98] ${
                    done ? "border-green-200" : "border-gray-100"
                  }`}
                >
                  {/* 단계 번호 */}
                  <div className="flex items-start justify-between">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      done ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"
                    }`}>
                      {done ? "✓" : step.num}
                    </span>
                    <span className="text-xl">{step.emoji}</span>
                  </div>

                  {/* 제목 + 설명 */}
                  <div>
                    <p className="text-sm font-bold text-gray-900 leading-snug">{step.title}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
                  </div>

                  {/* 상태 / CTA */}
                  <div className="mt-auto pt-1">
                    {done ? (
                      <p className="text-xs font-medium text-green-600">{status}</p>
                    ) : (
                      <p className="text-xs text-gray-400">{step.emptyHint}</p>
                    )}
                    <p className={`text-xs font-semibold mt-1 ${done ? "text-green-700" : "text-gray-600"}`}>
                      {step.cta} →
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 다음 할 일 안내 (자료가 있을 때) */}
        {isReady && !allEmpty && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">바로가기</p>
            <div className="flex flex-col gap-1">
              {[
                { href: "/pattern-remix/library", label: "기출 패턴 목록" },
                { href: "/source-passages/library", label: "지문 목록" },
                { href: "/pattern-remix/generate/library", label: "생성된 문제 목록" },
                { href: "/jobs", label: "처리 중인 작업 보기" },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <span className="text-sm text-gray-700">{link.label}</span>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
