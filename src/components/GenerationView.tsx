"use client";

import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { GeneratedQuestion, Difficulty } from "@/types/index";

const CIRCLE = ["①", "②", "③", "④", "⑤"];

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  기본: "bg-green-100 text-green-700 border border-green-200",
  응용: "bg-orange-100 text-orange-700 border border-orange-200",
  고난도: "bg-red-100 text-red-700 border border-red-200",
};

const TYPE_STYLE: Record<string, string> = {
  유사: "bg-blue-100 text-blue-700 border border-blue-200",
  변형: "bg-purple-100 text-purple-700 border border-purple-200",
  서술형: "bg-yellow-100 text-yellow-700 border border-yellow-200",
};

function formatQuestionForCopy(q: GeneratedQuestion, index: number): string {
  const typeLabel = q.type === "서술형" ? "서술형 문제" : `${q.type} 유형 문제 ${index + 1}`;
  const lines = [
    `[${typeLabel}] 난이도: ${q.difficulty}`,
    "",
    q.questionText,
    "",
  ];
  if (q.choices.length > 0) {
    for (const c of q.choices) {
      lines.push(`${CIRCLE[c.number - 1] ?? c.number} ${c.text}`);
    }
    lines.push("");
    lines.push(`정답: ${CIRCLE[q.answer - 1] ?? q.answer}번`);
  }
  if (q.descriptiveAnswer) {
    lines.push(`모범 답안: ${q.descriptiveAnswer}`);
  }
  lines.push("");
  lines.push(`해설: ${q.explanation}`);
  return lines.join("\n");
}

function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 hover:text-gray-800 transition-colors"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600">복사됨</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

function QuestionCard({ q, index }: { q: GeneratedQuestion; index: number }) {
  const [showExplanation, setShowExplanation] = useState(false);
  const copyText = formatQuestionForCopy(q, index);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_STYLE[q.type] ?? "bg-gray-100 text-gray-600"}`}>
            {q.type}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${DIFFICULTY_STYLE[q.difficulty] ?? "bg-gray-100 text-gray-600"}`}>
            {q.difficulty}
          </span>
        </div>
        <CopyButton text={copyText} />
      </div>

      {/* 발문 */}
      <p className="text-sm text-gray-800 font-medium leading-relaxed">{q.questionText}</p>

      {/* 객관식 선택지 */}
      {q.choices.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {q.choices.map((c) => (
            <div
              key={c.number}
              className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${
                c.isCorrect ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-100"
              }`}
            >
              <span className={`font-semibold flex-shrink-0 ${c.isCorrect ? "text-green-700" : "text-gray-500"}`}>
                {CIRCLE[c.number - 1] ?? c.number}
              </span>
              <span className={c.isCorrect ? "text-green-800" : "text-gray-700"}>{c.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* 서술형 모범 답안 */}
      {q.type === "서술형" && q.descriptiveAnswer && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-yellow-700 mb-1">모범 답안</p>
          <p className="text-sm text-yellow-800 leading-relaxed">{q.descriptiveAnswer}</p>
        </div>
      )}

      {/* 해설 토글 */}
      <button
        onClick={() => setShowExplanation((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 self-start"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${showExplanation ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {showExplanation ? "해설 닫기" : "해설 보기"}
      </button>

      {showExplanation && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-blue-700">해설</p>
          <p className="text-sm text-blue-800 leading-relaxed">{q.explanation}</p>
          {q.choices.length > 0 && (
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-xs font-semibold text-blue-700">선택지 분석</p>
              {q.choices.map((c) => (
                <div key={c.number} className="text-xs text-blue-700 leading-relaxed">
                  <span className="font-semibold">{CIRCLE[c.number - 1]}</span>
                  {" "}
                  <span className={c.isCorrect ? "text-green-700 font-medium" : "text-gray-600"}>
                    [{c.isCorrect ? "정답" : "오답"}]
                  </span>
                  {" "}{c.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Tab = "유사" | "변형" | "서술형";

export default function GenerationView() {
  const { structuredResult, analysisResult, generationResult, isGenerationLoading, setCurrentStep } =
    useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>("유사");

  const allQuestions = generationResult
    ? [
        ...generationResult.similarQuestions,
        ...generationResult.variantQuestions,
        generationResult.descriptiveQuestion,
      ]
    : [];

  const allCopyText = allQuestions
    .map((q, i) => formatQuestionForCopy(q, i))
    .join("\n\n" + "─".repeat(40) + "\n\n");

  const tabQuestions =
    activeTab === "유사"
      ? generationResult?.similarQuestions ?? []
      : activeTab === "변형"
      ? generationResult?.variantQuestions ?? []
      : generationResult
      ? [generationResult.descriptiveQuestion]
      : [];

  return (
    <div className="flex gap-6 flex-1 min-h-0">
      {/* 왼쪽: 원문 요약 참조 (30%) */}
      <div className="w-[30%] flex-shrink-0 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 overflow-y-auto">
        <div className="flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold text-gray-700">원문 분석 요약</span>
          <button
            onClick={() => setCurrentStep(3)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            3단계로
          </button>
        </div>

        {analysisResult && (
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">지문 핵심</p>
            <p className="text-xs text-gray-600 leading-relaxed">{analysisResult.passageKeyPoints}</p>
          </div>
        )}

        {structuredResult?.questions.map((q) => {
          const qa = analysisResult?.questions.find((a) => a.questionNumber === q.questionNumber);
          return (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-700 mb-0.5">{q.questionNumber}번</p>
              <p className="text-xs text-gray-600 mb-1 leading-relaxed">{q.questionText}</p>
              {qa && (
                <p className="text-xs text-blue-600">
                  정답 {CIRCLE[qa.answerNumber - 1] ?? qa.answerNumber}번 · {qa.intent.slice(0, 40)}...
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* 오른쪽: 생성 결과 (70%) */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
        {/* 로딩 */}
        {isGenerationLoading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
            <svg className="w-10 h-10 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-500 font-medium">유사·변형 문제를 생성 중입니다...</p>
          </div>
        )}

        {/* 빈 상태 */}
        {!isGenerationLoading && !generationResult && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 text-center">하단 버튼을 눌러 문제 생성을 시작하세요.</p>
          </div>
        )}

        {/* 생성 결과 */}
        {!isGenerationLoading && generationResult && (
          <>
            {/* 탭 + 전체 복사 */}
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {(["유사", "변형", "서술형"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab === "유사" ? `유사 유형 (3)` : tab === "변형" ? `변형 유형 (3)` : "서술형 (1)"}
                  </button>
                ))}
              </div>
              <CopyButton text={allCopyText} label="전체 복사" />
            </div>

            {/* 문제 카드 목록 */}
            {tabQuestions.map((q, i) => (
              <QuestionCard key={i} q={q} index={i} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
