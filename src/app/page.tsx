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
    title: "시험지 입력",
    desc: "기출 시험지 사진을 올리면 AI가 문항 패턴을 자동 분석합니다",
    href: "/pattern-remix",
    cta: "시험지 올리기",
    icon: (
      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    getStatus: (s: Stats) => s.patternSets > 0 ? `패턴 ${s.patternSets}개` : null,
  },
  {
    num: 2,
    title: "새 지문 입력",
    desc: "출제할 지문을 사진이나 텍스트로 등록합니다",
    href: "/source-passages",
    cta: "지문 등록하기",
    icon: (
      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    getStatus: (s: Stats) => s.passages > 0 ? `지문 ${s.passages}개` : null,
  },
  {
    num: 3,
    title: "문제지 생성",
    desc: "기출 패턴 × 새 지문으로 AI가 문항을 만들고 PDF·TXT로 저장합니다",
    href: "/pattern-remix/generate",
    cta: "문제 만들기",
    icon: (
      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    getStatus: (s: Stats) => s.questionSets > 0 ? `문제 세트 ${s.questionSets}개` : null,
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-none">국어 문제은행</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">AI 내신 문제 생성기</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-28 flex flex-col gap-3">

        {/* 빠른 이어가기 배너 */}
        {stats && stats.patternSets > 0 && stats.passages > 0 && (
          <Link
            href="/pattern-remix/generate"
            className="bg-green-600 text-white rounded-2xl p-4 flex items-center justify-between hover:bg-green-700 transition-colors shadow-md"
          >
            <div>
              <p className="text-sm font-bold">✨ 바로 문제 만들기</p>
              <p className="text-xs text-green-100 mt-0.5">
                패턴 {stats.patternSets}개 · 지문 {stats.passages}개 준비됨
              </p>
            </div>
            <svg className="w-5 h-5 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        {/* 3단계 카드 */}
        {STEPS.map((step, i) => {
          const status = stats ? step.getStatus(stats) : null;
          const done = !!status;
          return (
            <div key={step.num} className="flex gap-3 items-stretch">
              {/* 번호 + 연결선 */}
              <div className="flex flex-col items-center flex-shrink-0 pt-4" style={{ width: 28 }}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  done ? "bg-green-600 text-white" : "bg-white border-2 border-gray-300 text-gray-500"
                }`}>
                  {done ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : step.num}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-0.5 flex-1 mt-2 min-h-8 rounded-full ${done ? "bg-green-300" : "bg-gray-200"}`} />
                )}
              </div>

              {/* 카드 */}
              <Link
                href={step.href}
                className={`flex-1 bg-white rounded-2xl border-2 transition-all hover:shadow-md active:scale-[0.985] mb-2 overflow-hidden ${
                  done ? "border-green-200 hover:border-green-400" : "border-gray-200 hover:border-green-300"
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    done ? "bg-green-50" : "bg-gray-50"
                  }`}>
                    {step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[15px] font-bold text-gray-900">{step.title}</p>
                      {done && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                          {status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.desc}</p>
                  </div>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    done ? "bg-green-100" : "bg-gray-100"
                  }`}>
                    <svg className={`w-3.5 h-3.5 ${done ? "text-green-600" : "text-gray-400"}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* CTA 스트립 */}
                <div className={`px-4 py-2.5 border-t flex items-center justify-between ${
                  done ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"
                }`}>
                  <span className={`text-xs font-semibold ${done ? "text-green-700" : "text-gray-500"}`}>
                    {done ? `${step.cta} (추가)` : step.cta}
                  </span>
                  <svg className={`w-3.5 h-3.5 ${done ? "text-green-500" : "text-gray-400"}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </div>
          );
        })}

        {/* 자료 현황 */}
        {stats && (stats.patternSets > 0 || stats.passages > 0 || stats.questionSets > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mt-2">
            <p className="text-xs font-semibold text-gray-500 mb-3">내 자료 현황</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "기출 패턴", value: stats.patternSets, href: "/pattern-remix/library" },
                { label: "지문", value: stats.passages, href: "/source-passages/library" },
                { label: "문제 세트", value: stats.questionSets, href: "/pattern-remix/generate/library" },
              ].map(item => (
                <Link key={item.label} href={item.href}
                  className="bg-gray-50 hover:bg-green-50 rounded-xl px-3 py-3 text-center transition-colors group">
                  <p className="text-2xl font-bold text-gray-900 group-hover:text-green-700">{item.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
