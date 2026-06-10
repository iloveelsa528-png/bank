"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { PatternBasedQuestionSet, PatternBasedQuestion } from "@/types/pattern-remix";

const CIRCLE = ["①", "②", "③", "④", "⑤"];

const DIFF_COLOR: Record<string, string> = {
  기본: "bg-green-100 text-green-800",
  응용: "bg-yellow-100 text-yellow-800",
  고난도: "bg-red-100 text-red-800",
};

const TYPE_COLOR: Record<string, string> = {
  내용이해: "bg-blue-100 text-blue-700",
  추론: "bg-indigo-100 text-indigo-700",
  표현분석: "bg-purple-100 text-purple-700",
  어휘문법: "bg-pink-100 text-pink-700",
  비판적사고: "bg-orange-100 text-orange-700",
  적용: "bg-cyan-100 text-cyan-700",
  서술형: "bg-gray-100 text-gray-700",
};

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [questionSet, setQuestionSet] = useState<PatternBasedQuestionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [needLogin, setNeedLogin] = useState(false);
  const [needNeighbor, setNeedNeighbor] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then(async r => {
        const d = await r.json();
        if (r.status === 401 && d.needLogin) { setNeedLogin(true); return; }
        if (r.status === 403 && d.needNeighbor) { setNeedNeighbor(true); setOwnerId(d.ownerId ?? ""); return; }
        if (d.error) setLoadError(d.error);
        else setQuestionSet(d.questionSet);
      })
      .catch(() => setLoadError("로드에 실패했습니다."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (needLogin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-gray-600">
        <p className="text-2xl">🔐</p>
        <p className="text-lg font-semibold">로그인이 필요합니다</p>
        <p className="text-sm text-gray-400">이 문제는 서로이웃 전용 콘텐츠입니다.</p>
        <Link href="/login" className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition mt-1">
          로그인하기
        </Link>
      </div>
    );
  }

  if (needNeighbor) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-gray-600">
        <p className="text-2xl">👥</p>
        <p className="text-lg font-semibold">서로이웃만 열람할 수 있습니다</p>
        <p className="text-sm text-gray-400">이 문제는 작성자의 서로이웃에게만 공개됩니다.</p>
        {ownerId && (
          <Link href={`/profile/${ownerId}`} className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition mt-1">
            서로이웃 신청하기
          </Link>
        )}
        <Link href="/" className="text-sm text-gray-400 hover:underline">홈으로</Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 text-gray-500">
        <p className="text-lg">🔒 {loadError}</p>
        <p className="text-sm text-gray-400">링크가 만료되었거나 비공개 문서입니다.</p>
        <Link href="/" className="text-purple-600 hover:underline text-sm mt-2">홈으로</Link>
      </div>
    );
  }

  if (!questionSet) return null;

  const questions = questionSet.generated_questions ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{questionSet.title}</h1>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
              {questionSet.exam_pattern_sets?.school_name && (
                <span>{questionSet.exam_pattern_sets.school_name}</span>
              )}
              {questionSet.exam_pattern_sets?.grade && (
                <span>{questionSet.exam_pattern_sets.grade}</span>
              )}
              {questionSet.area && <span>{questionSet.area}</span>}
              <span>문항 {questions.length}개</span>
            </div>
          </div>
          <button
            onClick={() => setShowAnswers(v => !v)}
            className={`shrink-0 px-4 py-2 text-sm rounded-lg border font-medium transition ${
              showAnswers
                ? "bg-purple-600 text-white border-purple-600 hover:bg-purple-700"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {showAnswers ? "정답 숨기기" : "정답 보기"}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        {/* 지문 */}
        {questionSet.source_passages?.passage_text && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              지문{questionSet.source_passages?.title ? ` — ${questionSet.source_passages.title}` : ""}
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {questionSet.source_passages.passage_text}
            </p>
          </div>
        )}

        {/* 핵심 논거 */}
        {questionSet.source_passages?.key_points && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-amber-700 mb-1">핵심 논거</h2>
            <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">
              {questionSet.source_passages.key_points}
            </p>
          </div>
        )}

        {/* 문제 목록 */}
        {questions.map((q: PatternBasedQuestion, i: number) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start gap-2 mb-3">
              <span className="font-mono text-sm text-gray-500 shrink-0">{q.question_number}.</span>
              <div className="flex-1 min-w-0">
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[q.question_type] ?? "bg-gray-100 text-gray-700"}`}>
                    {q.question_type}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLOR[q.difficulty] ?? "bg-gray-100 text-gray-700"}`}>
                    {q.difficulty}
                  </span>
                  {q.answer === 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">서술형</span>
                  )}
                </div>
                <p className="text-sm text-gray-900 leading-snug">{q.question_text}</p>
              </div>
            </div>

            {q.choices.length > 0 && (
              <div className="space-y-1.5 ml-5">
                {q.choices.map((c, ci) => (
                  <div
                    key={ci}
                    className={`flex gap-2 text-sm px-3 py-2 rounded-lg border transition ${
                      showAnswers && c.is_correct
                        ? "border-green-300 bg-green-50 text-green-800 font-medium"
                        : "border-gray-100 text-gray-700"
                    }`}
                  >
                    <span className="shrink-0">{CIRCLE[c.number - 1]}</span>
                    <span>{c.text}</span>
                    {showAnswers && c.is_correct && (
                      <span className="ml-auto text-green-600 text-xs shrink-0">정답</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showAnswers && q.answer === 0 && q.descriptive_answer && (
              <div className="mt-3 ml-5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-700 mb-1">모범 답안</p>
                <p className="text-sm text-blue-900 whitespace-pre-wrap">{q.descriptive_answer}</p>
              </div>
            )}

            {showAnswers && q.explanation && (
              <div className="mt-2 ml-5 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs font-semibold text-yellow-700 mb-1">해설</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{q.explanation}</p>
              </div>
            )}
          </div>
        ))}

        <div className="text-center text-xs text-gray-400 py-6 border-t border-gray-100 mt-4">
          이 문제는 국어 문제 뱅크에서 공유되었습니다.
        </div>
      </main>
    </div>
  );
}
