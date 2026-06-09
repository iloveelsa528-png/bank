"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProblemWithQuestions } from "@/types/index";
import AuthUserMenu from "@/components/AuthUserMenu";

const CIRCLE = ["①", "②", "③", "④", "⑤"];
const TYPE_STYLE: Record<string, string> = {
  유사: "bg-blue-100 text-blue-700",
  변형: "bg-purple-100 text-purple-700",
  서술형: "bg-yellow-100 text-yellow-700",
};
const DIFF_STYLE: Record<string, string> = {
  기본: "bg-green-100 text-green-700",
  응용: "bg-orange-100 text-orange-700",
  고난도: "bg-red-100 text-red-700",
};

export default function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [problem, setProblem] = useState<ProblemWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", school_name: "", grade: "", subject_area: "", unit_name: "", difficulty: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/problems/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setProblem(d.problem ?? null);
        if (d.problem) {
          setForm({
            title: d.problem.title ?? "",
            school_name: d.problem.school_name ?? "",
            grade: d.problem.grade ?? "",
            subject_area: d.problem.subject_area ?? "",
            unit_name: d.problem.unit_name ?? "",
            difficulty: d.problem.difficulty ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/problems/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setEditing(false);
    setProblem((p) => p ? { ...p, ...form } : p);
  };

  const handleDelete = async () => {
    if (!confirm("이 문제를 삭제하시겠습니까?")) return;
    setDeleting(true);
    await fetch(`/api/problems/${id}`, { method: "DELETE" });
    router.push("/problems");
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );

  if (!problem) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
      <p className="text-gray-500">문제를 찾을 수 없습니다.</p>
      <Link href="/problems" className="text-blue-600 hover:underline text-sm">목록으로</Link>
    </div>
  );

  const similar = problem.generated_questions?.filter((q) => q.question_type === "유사") ?? [];
  const variant = problem.generated_questions?.filter((q) => q.question_type === "변형") ?? [];
  const descriptive = problem.generated_questions?.filter((q) => q.question_type === "서술형") ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/problems" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-bold text-gray-900 truncate flex-1">{problem.title}</h1>
          <div className="flex gap-2 items-center">
            <AuthUserMenu />
            <button onClick={() => setEditing((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              {editing ? "취소" : "수정"}
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50">
              {deleting ? "삭제 중..." : "삭제"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-5">
        {/* 메타 정보 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">문제 정보</h2>
          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "제목", key: "title" },
                { label: "학교명", key: "school_name" },
                { label: "학년", key: "grade" },
                { label: "영역", key: "subject_area" },
                { label: "단원", key: "unit_name" },
                { label: "난이도", key: "difficulty" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <div className="col-span-2 flex justify-end">
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
              {[
                ["학교명", problem.school_name],
                ["학년", problem.grade],
                ["영역", problem.subject_area],
                ["단원", problem.unit_name],
                ["난이도", problem.difficulty],
                ["저장일", new Date(problem.created_at).toLocaleDateString("ko-KR")],
              ].map(([k, v]) => v ? (
                <div key={k}>
                  <dt className="text-xs text-gray-500">{k}</dt>
                  <dd className="font-medium text-gray-800">{v}</dd>
                </div>
              ) : null)}
            </dl>
          )}
        </div>

        {/* OCR 원문 */}
        {problem.ocr_edited_text && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">OCR 원문</h2>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {problem.ocr_edited_text}
            </pre>
          </div>
        )}

        {/* 구조화 데이터 */}
        {problem.structured_data && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">구조화된 문제</h2>
            {problem.structured_data.passageContent && (
              <div className="mb-3 p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 mb-1">지문</p>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {problem.structured_data.passageContent}
                </p>
              </div>
            )}
            {problem.structured_data.questions?.map((q) => (
              <div key={q.id} className="border-t border-gray-100 pt-3 mt-3">
                <p className="text-sm font-medium text-gray-800 mb-2">{q.questionNumber}. {q.questionText}</p>
                {q.choices.map((c) => (
                  <p key={c.number} className="text-xs text-gray-600 ml-2">
                    {CIRCLE[c.number - 1]} {c.text}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* 생성 문제 */}
        {problem.generated_questions?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              생성된 문제 ({problem.generated_questions.length}개)
            </h2>
            {[...similar, ...variant, ...descriptive].map((q, i) => (
              <div key={q.id} className={`${i > 0 ? "border-t border-gray-100 pt-4 mt-4" : ""}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_STYLE[q.question_type] ?? "bg-gray-100 text-gray-600"}`}>
                    {q.question_type}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${DIFF_STYLE[q.difficulty] ?? "bg-gray-100 text-gray-600"}`}>
                    {q.difficulty}
                  </span>
                  {q.answer > 0 && <span className="text-xs font-semibold text-gray-600">정답: {CIRCLE[q.answer - 1]}</span>}
                </div>
                <p className="text-sm text-gray-800 mb-2">{q.question_text}</p>
                {q.choices?.map((c: { number: number; text: string }) => (
                  <p key={c.number} className="text-xs text-gray-600 ml-2">
                    {CIRCLE[c.number - 1]} {c.text}
                  </p>
                ))}
                {q.descriptive_answer && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded-lg">
                    <p className="text-xs text-yellow-700"><span className="font-semibold">모범 답안:</span> {q.descriptive_answer}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  <span className="font-semibold">해설:</span> {q.explanation}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
