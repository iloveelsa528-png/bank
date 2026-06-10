"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Stats {
  patternSets: number;
  passages: number;
  questionSets: number;
}

const QUICK_ACTIONS = [
  {
    href: "/pattern-remix",
    label: "기출 분석",
    sub: "시험지 OCR + 패턴 추출",
    icon: (
      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    color: "bg-green-50 border-green-100",
  },
  {
    href: "/source-passages",
    label: "지문 등록",
    sub: "새 지문 입력 / OCR",
    icon: (
      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    color: "bg-green-50 border-green-100",
  },
  {
    href: "/pattern-remix/generate",
    label: "문제 생성",
    sub: "패턴 × 지문 → AI 문제",
    icon: (
      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: "bg-purple-50 border-purple-100",
  },
];

const LIBRARY_LINKS = [
  { href: "/pattern-remix/library", label: "패턴 라이브러리", sub: "저장된 기출 패턴 목록" },
  { href: "/source-passages/library", label: "지문 라이브러리", sub: "등록된 지문 목록" },
  { href: "/pattern-remix/generate/library", label: "생성된 문제 목록", sub: "편집·공유·PDF" },
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
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900 leading-tight">국어 문제은행</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-4">

        {/* 통계 배너 */}
        <div className="bg-green-600 rounded-2xl p-5 text-white">
          <p className="text-sm font-medium opacity-90 mb-3">내 학습 자료 현황</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "패턴 세트", value: stats?.patternSets ?? "-", href: "/pattern-remix/library" },
              { label: "지문", value: stats?.passages ?? "-", href: "/source-passages/library" },
              { label: "문제 세트", value: stats?.questionSets ?? "-", href: "/pattern-remix/generate/library" },
            ].map(item => (
              <Link
                key={item.label}
                href={item.href}
                className="bg-white/20 hover:bg-white/30 active:bg-white/40 rounded-xl px-3 py-2.5 text-center transition-colors"
              >
                <p className="text-xl font-bold">{item.value}</p>
                <p className="text-xs opacity-80 mt-0.5">{item.label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* 빠른 실행 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-800 mb-3">빠른 실행</p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(action => (
              <Link
                key={action.href}
                href={action.href}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm active:scale-95 ${action.color}`}
              >
                <div className="flex-shrink-0">{action.icon}</div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{action.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-tight">{action.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 문제 만들기 흐름 안내 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-800 mb-3">문제 만들기 순서</p>
          <div className="flex flex-col gap-0">
            {[
              { step: 1, label: "기출 시험지 등록", sub: "이미지 업로드 → OCR → 패턴 추출", href: "/pattern-remix", color: "bg-green-600" },
              { step: 2, label: "새 지문 등록", sub: "출제할 지문 텍스트 또는 이미지 입력", href: "/source-passages", color: "bg-green-600" },
              { step: 3, label: "문제 자동 생성", sub: "패턴 × 지문 → Claude AI가 문항 생성", href: "/pattern-remix/generate", color: "bg-purple-600" },
            ].map((item, i, arr) => (
              <div key={item.step}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 py-3 px-1 rounded-xl hover:bg-gray-50 transition-colors active:bg-gray-100"
                >
                  <div className={`w-7 h-7 rounded-full ${item.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                    {item.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                {i < arr.length - 1 && (
                  <div className="ml-6 flex items-center gap-1 py-0.5">
                    <div className="w-px h-4 bg-gray-200 ml-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 라이브러리 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-800 mb-3">라이브러리</p>
          <div className="flex flex-col divide-y divide-gray-50">
            {LIBRARY_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded-xl px-1 transition-colors active:bg-gray-100"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{link.label}</p>
                  <p className="text-xs text-gray-500">{link.sub}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* AI 안내 */}
        <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3.5 flex items-start gap-3">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-green-800">빠른 문제 생성</p>
            <p className="text-xs text-green-700 mt-0.5 leading-relaxed">구조화·패턴 추출이 단일 AI 호출로 통합되어 약 40% 빠르게 처리됩니다.</p>
          </div>
        </div>

      </main>
    </div>
  );
}
