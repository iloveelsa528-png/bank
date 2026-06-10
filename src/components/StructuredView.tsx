"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";
import { StructuredResult, Question, Choice } from "@/types/index";

const AREA_BADGE: Record<StructuredResult["area"], string> = {
  문학: "bg-purple-100 text-purple-700 border border-purple-200",
  독서: "bg-blue-100 text-blue-700 border border-blue-200",
  문법: "bg-green-100 text-green-700 border border-green-200",
  화작: "bg-orange-100 text-orange-700 border border-orange-200",
  기타: "bg-gray-100 text-gray-600 border border-gray-200",
};

const CIRCLE_NUMBERS = ["①", "②", "③", "④", "⑤"];

export default function StructuredView() {
  const {
    editedOcrText,
    structuredResult,
    structuredResults,
    selectedGroupIndex,
    isStructureLoading,
    setStructuredResult,
    setStructuredResults,
    setSelectedGroupIndex,
    setCurrentStep,
  } = useAppContext();

  // 그룹 선택 핸들러
  const handleSelectGroup = (index: number) => {
    setSelectedGroupIndex(index);
    setStructuredResult(structuredResults[index]);
  };

  // 다른 지문 선택으로 돌아가기
  const handleResetGroupSelection = () => {
    setSelectedGroupIndex(-1);
    setStructuredResult(null);
  };

  // ── 헬퍼: structuredResult를 불변 방식으로 업데이트 ──────────────────────
  const updateResult = (updater: (prev: StructuredResult) => StructuredResult) => {
    if (!structuredResult) return;
    setStructuredResult(updater(structuredResult));
  };

  const updateQuestion = (
    questionId: string,
    updater: (q: Question) => Question
  ) => {
    updateResult((prev) => ({
      ...prev,
      questions: (prev.questions ?? []).map((q) =>
        q.id === questionId ? updater(q) : q
      ),
    }));
  };

  const updateChoice = (
    questionId: string,
    choiceNumber: number,
    text: string
  ) => {
    updateQuestion(questionId, (q) => ({
      ...q,
      choices: (q.choices ?? []).map((c: Choice) =>
        c.number === choiceNumber ? { ...c, text } : c
      ),
    }));
  };

  // ── 렌더링 ────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-6 flex-1 min-h-0">
      {/* ── 왼쪽: OCR 원문 참조 (40%) ─────────────────────────────────────── */}
      <div className="w-[40%] flex-shrink-0 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold text-gray-700">OCR 원문</span>
          <button
            onClick={() => setCurrentStep(1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            1단계로 돌아가기
          </button>
        </div>

        {/* 원문 텍스트 */}
        <textarea
          readOnly
          value={editedOcrText}
          className="flex-1 w-full resize-none bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 leading-relaxed focus:outline-none overflow-y-auto"
          placeholder="OCR 원문이 여기 표시됩니다."
        />
      </div>

      {/* ── 오른쪽: 구조화 결과 (60%) ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
        {/* 로딩 중 */}
        {isStructureLoading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
            <svg
              className="w-10 h-10 animate-spin text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-sm text-gray-500 font-medium">
              AI가 텍스트를 분석 중입니다...
            </p>
          </div>
        )}

        {/* 빈 상태: 분석 결과 없음 */}
        {!isStructureLoading && !structuredResult && structuredResults.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-500 text-center">
              하단 버튼을 눌러 구조화 분석을 시작하세요.
            </p>
          </div>
        )}

        {/* 그룹 선택 화면: 여러 그룹이 있고 아직 선택 안 됨 */}
        {!isStructureLoading && structuredResults.length > 1 && selectedGroupIndex === -1 && (
          <div className="flex-1 flex flex-col gap-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-gray-800">여러 지문 그룹이 감지되었습니다.</p>
              <p className="text-sm text-gray-500">분석할 지문 그룹을 선택하세요.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {structuredResults.map((group, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectGroup(index)}
                  className="text-left p-4 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                >
                  <div className="font-semibold text-gray-800 text-sm mb-1">
                    {group.passageGroupLabel || `그룹 ${index + 1}`}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${AREA_BADGE[group.area] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                      {group.area}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {group.passageTitle || (group.passageContent ? group.passageContent.slice(0, 30) + "..." : "")}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-blue-600 font-medium">{group.questions.length}문제</span>
                    <span className="text-xs text-green-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      선택 →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 구조화 결과 카드들 */}
        {!isStructureLoading && structuredResult && (
          <>
            {/* 선택된 그룹 라벨 + 다른 지문 선택 버튼 (다중 그룹일 때만) */}
            {structuredResults.length > 1 && selectedGroupIndex >= 0 && (
              <div className="flex items-center justify-between flex-shrink-0 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-blue-700">선택된 그룹</span>
                  <span className="text-xs font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-full">
                    {structuredResult.passageGroupLabel || `그룹 ${selectedGroupIndex + 1}`}
                  </span>
                </div>
                <button
                  onClick={handleResetGroupSelection}
                  className="flex items-center gap-1.5 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-100 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  다른 지문 선택
                </button>
              </div>
            )}

            {/* 1. 영역 배지 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${AREA_BADGE[structuredResult.area] ?? "bg-gray-100 text-gray-600 border border-gray-200"}`}
              >
                {structuredResult.area || "기타"}
              </span>
              <span className="text-xs text-gray-400">영역</span>
            </div>

            {/* 내용이 없을 때 안내 */}
            {!structuredResult.passageContent &&
              !structuredResult.sharedBoxContent &&
              (structuredResult.questions ?? []).length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-sm text-yellow-800">
                <p className="font-semibold mb-1">구조화된 내용이 없습니다</p>
                <p className="text-yellow-700">OCR 텍스트가 너무 짧거나 시험지 형식이 아닐 수 있습니다. 1단계로 돌아가서 OCR을 다시 실행하거나 텍스트를 직접 입력해보세요.</p>
              </div>
            )}

            {/* 2. 지문 카드 */}
            {structuredResult.passageContent !== undefined && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 flex-shrink-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-800">지문</span>
                  {(structuredResult.passageTitle || structuredResult.passageAuthor) && (
                    <span className="text-xs text-gray-500 text-right leading-relaxed">
                      {structuredResult.passageTitle && (
                        <span className="font-medium">{structuredResult.passageTitle}</span>
                      )}
                      {structuredResult.passageTitle && structuredResult.passageAuthor && " / "}
                      {structuredResult.passageAuthor && (
                        <span>{structuredResult.passageAuthor}</span>
                      )}
                    </span>
                  )}
                </div>
                <textarea
                  value={structuredResult.passageContent}
                  onChange={(e) =>
                    updateResult((prev) => ({
                      ...prev,
                      passageContent: e.target.value,
                    }))
                  }
                  rows={8}
                  className="w-full resize-y rounded-xl border border-gray-300 p-3 text-sm text-gray-700 leading-relaxed focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-colors"
                  placeholder="지문 내용을 입력하세요."
                />
              </div>
            )}

            {/* 3. 공통 보기 카드 */}
            {structuredResult.sharedBoxContent !== undefined && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 flex-shrink-0">
                <span className="text-sm font-semibold text-gray-800">&lt;보기&gt;</span>
                <textarea
                  value={structuredResult.sharedBoxContent}
                  onChange={(e) =>
                    updateResult((prev) => ({
                      ...prev,
                      sharedBoxContent: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full resize-y rounded-xl border border-gray-300 p-3 text-sm text-gray-700 leading-relaxed focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-colors"
                  placeholder="공통 보기 내용을 입력하세요."
                />
              </div>
            )}

            {/* 4. 문제 카드들 */}
            {(structuredResult.questions ?? []).map((question) => (
              <div
                key={question.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 flex-shrink-0"
              >
                {/* 문제 헤더 */}
                <span className="text-sm font-semibold text-gray-800">
                  문제 {question.questionNumber}번
                </span>

                {/* 발문 textarea */}
                <textarea
                  value={question.questionText}
                  onChange={(e) =>
                    updateQuestion(question.id, (q) => ({
                      ...q,
                      questionText: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full resize-y rounded-xl border border-gray-300 p-3 text-sm text-gray-700 leading-relaxed focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-colors"
                  placeholder="발문을 입력하세요."
                />

                {/* 이 문제의 boxText */}
                {question.boxText !== undefined && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-gray-500">&lt;보기&gt;</span>
                    <textarea
                      value={question.boxText}
                      onChange={(e) =>
                        updateQuestion(question.id, (q) => ({
                          ...q,
                          boxText: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full resize-y rounded-xl border border-gray-300 p-3 text-sm text-gray-700 leading-relaxed focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-colors"
                      placeholder="보기 내용을 입력하세요."
                    />
                  </div>
                )}

                {/* 선택지 */}
                {question.choices.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {(question.choices ?? []).map((choice) => (
                      <div key={choice.number} className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 flex-shrink-0 w-5 text-center select-none">
                          {CIRCLE_NUMBERS[choice.number - 1] ?? choice.number}
                        </span>
                        <input
                          type="text"
                          value={choice.text}
                          onChange={(e) =>
                            updateChoice(question.id, choice.number, e.target.value)
                          }
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-colors"
                          placeholder={`선택지 ${choice.number}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
