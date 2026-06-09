"use client";

import React, { useState } from "react";

interface Props {
  onSave: (meta: {
    title: string;
    schoolName: string;
    grade: string;
    subjectArea: string;
    unitName: string;
    difficulty: string;
  }) => Promise<void>;
  onClose: () => void;
  defaultArea?: string;
}

const GRADES = ["고1", "고2", "고3", "중1", "중2", "중3"];
const AREAS = ["문학", "독서", "문법", "화작", "기타"];
const DIFFICULTIES = ["기본", "응용", "고난도", "혼합"];

export default function SaveModal({ onSave, onClose, defaultArea = "" }: Props) {
  const [title, setTitle] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [grade, setGrade] = useState("");
  const [subjectArea, setSubjectArea] = useState(defaultArea);
  const [unitName, setUnitName] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!title.trim()) { setError("제목을 입력하세요."); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({ title, schoolName, grade, subjectArea, unitName, difficulty });
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">문제 저장</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* 제목 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">제목 *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2024 수능 국어 언어와 매체"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* 학교명 + 학년 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">학교명</label>
              <input
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="예: ○○고등학교"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">학년</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">선택</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* 영역 + 난이도 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">영역</label>
              <select
                value={subjectArea}
                onChange={(e) => setSubjectArea(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">선택</option>
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">난이도</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">선택</option>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* 단원 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">단원</label>
            <input
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              placeholder="예: 독서 - 사회·문화"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end mt-1">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
            취소
          </button>
          <button onClick={handleSave} disabled={saving}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
              saving ? "bg-blue-400 text-white cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
            }`}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
