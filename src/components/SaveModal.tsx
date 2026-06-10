"use client";

import React, { useState, useEffect, useRef } from "react";

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

const INPUT_CLS = "w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-colors bg-white";
const SELECT_CLS = "w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-colors bg-white";
const LABEL_CLS = "text-xs font-semibold text-gray-700 mb-1.5 block";

export default function SaveModal({ onSave, onClose, defaultArea = "" }: Props) {
  const [title, setTitle] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [grade, setGrade] = useState("");
  const [subjectArea, setSubjectArea] = useState(defaultArea);
  const [unitName, setUnitName] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // ESC로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!title.trim()) { setError("제목을 입력하세요."); titleRef.current?.focus(); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({ title: title.trim(), schoolName, grade, subjectArea, unitName, difficulty });
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-5 p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">문제 저장</h2>
            <p className="text-xs text-gray-500 mt-0.5">문제은행에 저장할 정보를 입력하세요</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* 제목 */}
          <div>
            <label className={LABEL_CLS}>
              제목 <span className="text-blue-500">*</span>
            </label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (error) setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              placeholder="예: 2024 수능 국어 언어와 매체"
              className={INPUT_CLS + (error ? " border-red-400 focus:border-red-400 focus:ring-red-100" : "")}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* 학교명 + 학년 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>학교명</label>
              <input
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="예: ○○고등학교"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>학년</label>
              <select value={grade} onChange={(e) => setGrade(e.target.value)} className={SELECT_CLS}>
                <option value="">선택 안 함</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* 영역 + 난이도 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>영역</label>
              <select value={subjectArea} onChange={(e) => setSubjectArea(e.target.value)} className={SELECT_CLS}>
                <option value="">선택 안 함</option>
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>난이도</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={SELECT_CLS}>
                <option value="">선택 안 함</option>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* 단원 */}
          <div>
            <label className={LABEL_CLS}>단원</label>
            <input
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              placeholder="예: 독서 - 사회·문화"
              className={INPUT_CLS}
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 justify-end pt-1 border-t border-gray-100">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
            취소
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 rounded-xl text-sm font-semibold transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                저장 중...
              </span>
            ) : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
