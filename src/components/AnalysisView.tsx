"use client";

import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { QuestionAnalysis } from "@/types/index";

const CIRCLE = ["①", "②", "③", "④", "⑤"];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {children}
    </span>
  );
}

function Tag({ correct }: { correct: boolean }) {
  return correct ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
      정답
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 border border-red-200">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
      오답
    </span>
  );
}

function QuestionCard({ qa, index }: { qa: QuestionAnalysis; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 헤더 — 클릭해서 접기/펴기 */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {qa.questionNumber}
          </span>
          <span className="text-sm font-semibold text-gray-800">
            문항 {qa.questionNumber}번 분석
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            정답 {CIRCLE[qa.answerNumber - 1] ?? qa.answerNumber}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 flex flex-col gap-4 border-t border-gray-100">
          {/* 출제 의도 */}
          <div className="flex flex-col gap-1.5 pt-4">
            <SectionLabel>출제 의도</SectionLabel>
            <p className="text-sm text-gray-700 leading-relaxed">{qa.intent}</p>
          </div>

          {/* 정답 근거 */}
          <div className="flex flex-col gap-1.5">
            <SectionLabel>정답 근거</SectionLabel>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-sm text-green-800 leading-relaxed">{qa.answerBasis}</p>
            </div>
          </div>

          {/* 선택지 분석 */}
          {qa.choiceAnalysis.length > 0 && (
            <div className="flex flex-col gap-2">
              <SectionLabel>선택지 분석</SectionLabel>
              {qa.choiceAnalysis.map((c, ci) => (
                <div
                  key={ci}
                  className={`rounded-xl border p-3 flex flex-col gap-1 ${
                    c.isCorrect
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${c.isCorrect ? "text-green-700" : "text-gray-600"}`}>
                      {CIRCLE[c.number - 1] ?? c.number}
                    </span>
                    <Tag correct={c.isCorrect} />
                  </div>
                  <p className={`text-xs leading-relaxed ${c.isCorrect ? "text-green-700" : "text-gray-600"}`}>
                    {c.reason}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 헷갈릴 수 있는 지점 */}
          <div className="flex flex-col gap-1.5">
            <SectionLabel>헷갈릴 수 있는 지점</SectionLabel>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <p className="text-sm text-yellow-800 leading-relaxed">{qa.confusionPoints}</p>
            </div>
          </div>

          {/* 변형 문제 요소 */}
          <div className="flex flex-col gap-1.5">
            <SectionLabel>변형 문제 출제 요소</SectionLabel>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
              <p className="text-sm text-purple-800 leading-relaxed">{qa.variantElements}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalysisView() {
  const { structuredResult, analysisResult, isAnalysisLoading, setCurrentStep } =
    useAppContext();

  return (
    <div className="flex gap-6 flex-1 min-h-0">
      {/* 왼쪽: 구조화 결과 참조 (35%) */}
      <div className="w-[35%] flex-shrink-0 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 overflow-y-auto">
        <div className="flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold text-gray-700">구조화 결과</span>
          <button
            onClick={() => setCurrentStep(2)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            2단계로 돌아가기
          </button>
        </div>

        {structuredResult ? (
          <div className="flex flex-col gap-3 text-sm text-gray-700">
            {structuredResult.passageContent && (
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">지문</p>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap line-clamp-[20]">
                  {structuredResult.passageContent}
                </p>
              </div>
            )}
            {structuredResult.questions.map((q) => (
              <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-3">
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  {q.questionNumber}번. {q.questionText}
                </p>
                {q.choices.map((c, ci) => (
                  <p key={ci} className="text-xs text-gray-500">
                    {["①", "②", "③", "④", "⑤"][c.number - 1]} {c.text}
                  </p>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">구조화 결과가 없습니다.</p>
        )}
      </div>

      {/* 오른쪽: 분석 결과 (65%) */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
        {/* 로딩 */}
        {isAnalysisLoading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
            <svg className="w-10 h-10 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-500 font-medium">AI가 문항을 분석 중입니다...</p>
          </div>
        )}

        {/* 빈 상태 */}
        {!isAnalysisLoading && !analysisResult && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 text-center">
              하단 버튼을 눌러 문항 분석을 시작하세요.
            </p>
          </div>
        )}

        {/* 분석 결과 */}
        {!isAnalysisLoading && analysisResult && (
          <>
            {/* 지문 핵심 내용 카드 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-800">지문 핵심 내용</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{analysisResult.passageKeyPoints}</p>
            </div>

            {/* 문항별 분석 카드 */}
            {analysisResult.questions.map((qa, i) => (
              <QuestionCard key={qa.questionNumber} qa={qa} index={i} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
