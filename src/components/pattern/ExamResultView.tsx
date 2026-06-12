'use client';

import { useState, useEffect } from 'react';
import type { ExamPattern, ExamPatternSetMeta } from '@/types/patterns';

interface AnalyzedGroup {
  passageGroupLabel?: string;
  area: string;
  passageTitle?: string;
  passageAuthor?: string;
  passageContent?: string;
  sharedBoxContent?: string;
  questions: Array<{
    id?: string;
    questionNumber: number;
    questionText: string;
    boxText?: string;
    choices: Array<{ number: number; text: string }>;
  }>;
  patterns: ExamPattern[];
}

interface ExamResultViewProps {
  groups: AnalyzedGroup[];
  jobId: string;
  segmentFailed?: boolean;
  onSaved?: (patternSetId: string) => void;
}

const GRADES    = ['고1', '고2', '고3', '중1', '중2', '중3'];
const SEMESTERS = ['1학기', '2학기'];
const EXAM_NAMES = ['1차 지필', '2차 지필', '3차 지필', '수능', '모의고사', '기타'];
const AREAS     = ['문학', '독서', '문법', '화작', '기타'];

const INPUT_CLS  = 'w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white';
const SELECT_CLS = 'w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white';
const LABEL_CLS  = 'text-xs font-semibold text-gray-700 mb-1 block';

function groupLabel(g: AnalyzedGroup, i: number): string {
  if (g.passageGroupLabel) return g.passageGroupLabel;
  const nums = g.patterns.map(p => p.question_number).filter(n => n > 0).sort((a, b) => a - b);
  if (nums.length === 0) return `그룹 ${i + 1}`;
  if (nums.length === 1) return `${nums[0]}번`;
  return `${nums[0]}~${nums[nums.length - 1]}번`;
}

function PatternTag({ pattern }: { pattern: ExamPattern }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {pattern.question_number}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{pattern.question_type}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            pattern.difficulty === '기본' ? 'bg-green-100 text-green-700' :
            pattern.difficulty === '응용' ? 'bg-orange-100 text-orange-700' :
            'bg-red-100 text-red-700'
          }`}>{pattern.difficulty}</span>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 text-xs text-gray-700 space-y-1.5">
          <p><span className="font-semibold">발문:</span> {pattern.prompt_style}</p>
          <p><span className="font-semibold">선택지:</span> {pattern.choice_style}</p>
          <p><span className="font-semibold">난이도:</span> {pattern.difficulty}</p>
          <div className="bg-green-50 rounded-lg px-3 py-2 mt-1">
            <p className="font-semibold text-green-600 mb-0.5">패턴 요약</p>
            <p className="text-blue-800 leading-relaxed">{pattern.pattern_summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const MEMO_KEY = 'examMeta';

export default function ExamResultView({ groups, jobId, segmentFailed, onSaved }: ExamResultViewProps) {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [meta, setMeta] = useState<ExamPatternSetMeta>({
    title: '', school_name: '', grade: '', semester: '', exam_name: '',
    area: groups[0]?.area ?? '', description: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MEMO_KEY);
      if (saved) {
        const { school_name, grade, semester } = JSON.parse(saved);
        setMeta(m => ({ ...m, school_name: school_name ?? '', grade: grade ?? '', semester: semester ?? '' }));
      }
    } catch { /* ignore */ }
  }, []);

  // 학교·학년·학기·시험명이 채워지면 제목 자동생성
  useEffect(() => {
    const parts = [meta.school_name, meta.grade, meta.semester, meta.exam_name].filter(Boolean);
    if (parts.length >= 2 && !meta.title) {
      setMeta(m => ({ ...m, title: parts.join(' ') }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.school_name, meta.grade, meta.semester, meta.exam_name]);

  const handleSaveAll = async () => {
    if (!meta.title.trim()) { setError('제목을 입력하세요.'); return; }
    setSaving(true); setError(''); setSaveProgress(0);
    const ids: string[] = [];
    try {
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        const label = groupLabel(g, i);
        const groupTitle = groups.length === 1 ? meta.title : `${meta.title} - ${label}`;
        const groupArea = g.area || meta.area;
        const res = await fetch('/api/pattern-sets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meta: { ...meta, title: groupTitle, area: groupArea },
            patterns: g.patterns,
            source_job_id: jobId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(`${label} 저장 실패: ${data.error ?? '오류'}`);
        ids.push(data.id);
        setSaveProgress(i + 1);
        onSaved?.(data.id);
      }
      localStorage.setItem(MEMO_KEY, JSON.stringify({
        school_name: meta.school_name, grade: meta.grade, semester: meta.semester,
      }));
      setSavedIds(ids);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (savedIds.length > 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-semibold text-green-700">
            패턴 세트 {savedIds.length}개 저장 완료
          </span>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">
          이제 새로운 지문을 등록하고, 저장한 패턴을 적용해 문제를 생성할 수 있습니다.
        </p>
        <a href="/source-passages"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm">
          2단계 — 새 지문 등록하러 가기 →
        </a>
        <div className="flex gap-2 flex-wrap">
          <a href="/pattern-remix/generate"
            className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-medium bg-white border border-green-300 text-green-700 hover:bg-green-50 transition-colors">
            문제 생성하러 가기 →
          </a>
          <a href="/pattern-remix/library"
            className="px-3 py-2.5 rounded-xl text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
            패턴 라이브러리
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {segmentFailed && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex gap-3 items-start">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">지문 분할 실패 — 전체 텍스트가 하나로 묶여 있습니다</p>
            <p className="text-xs text-amber-700 mt-0.5">이미지를 지문별로 나눠서 재업로드하거나, 지문 수가 많은 시험지는 페이지를 분리해 올려주세요.</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-sm font-semibold text-gray-800">분석 완료 — {groups.length}개 지문 그룹</p>
      </div>

      {/* 그룹 목록 (확장 가능) */}
      <div className="flex flex-col gap-2">
        {groups.map((g, i) => {
          const label = groupLabel(g, i);
          const isOpen = expandedGroup === i;
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedGroup(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800">{label}</span>
                  {g.area && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{g.area}</span>
                  )}
                  <span className="text-xs text-gray-500">{g.questions.length}문항 · 패턴 {g.patterns.length}개</span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-3 flex flex-col gap-3">
                  {/* 인식된 지문 본문 */}
                  {g.passageContent && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">인식된 지문</p>
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 max-h-48 overflow-y-auto border border-gray-100">
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{g.passageContent}</p>
                      </div>
                    </div>
                  )}
                  {/* 문항 목록 */}
                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                    {g.questions.map((q, qi) => (
                      <div key={q.id ?? qi} className="bg-gray-50 rounded-lg px-3 py-1.5">
                        <p className="text-xs text-gray-700">{q.questionNumber}번. {q.questionText.slice(0, 60)}{q.questionText.length > 60 ? '…' : ''}</p>
                      </div>
                    ))}
                  </div>
                  {g.patterns.map(p => <PatternTag key={p.question_number} pattern={p} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 저장 폼 */}
      <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-bold text-violet-700 border-b border-violet-100 pb-3 mb-4">시험 정보 입력</p>
          {groups.length > 1 && (
            <p className="text-xs text-gray-500 mb-3">
              입력한 제목에 그룹명이 자동으로 붙어 저장됩니다.
              예: <span className="font-medium text-gray-700">{meta.title || '2024 수완고 1학년 1차 지필'} - 1~4번</span>
            </p>
          )}
        </div>
        <div>
          <label className={LABEL_CLS}>제목 <span className="text-violet-500">*</span></label>
          <input value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))}
            placeholder="예: 2024 수완고 1학년 1차 지필"
            className={INPUT_CLS + (error ? ' border-red-400' : '')} />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>학교명</label>
            <input value={meta.school_name} onChange={e => setMeta(m => ({ ...m, school_name: e.target.value }))}
              placeholder="예: 수완고" className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>학년</label>
            <select value={meta.grade} onChange={e => setMeta(m => ({ ...m, grade: e.target.value }))} className={SELECT_CLS}>
              <option value="">선택</option>
              {GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>학기</label>
            <select value={meta.semester} onChange={e => setMeta(m => ({ ...m, semester: e.target.value }))} className={SELECT_CLS}>
              <option value="">선택</option>
              {SEMESTERS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>시험명</label>
            <select value={meta.exam_name} onChange={e => setMeta(m => ({ ...m, exam_name: e.target.value }))} className={SELECT_CLS}>
              <option value="">선택</option>
              {EXAM_NAMES.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          {groups.length === 1 && (
            <div>
              <label className={LABEL_CLS}>영역</label>
              <select value={meta.area} onChange={e => setMeta(m => ({ ...m, area: e.target.value }))} className={SELECT_CLS}>
                <option value="">선택</option>
                {AREAS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          )}
        </div>
        <button onClick={handleSaveAll} disabled={saving}
          className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all ${
            !saving ? 'bg-green-600 text-white hover:bg-green-700 shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}>
          {saving
            ? `저장 중… (${saveProgress}/${groups.length})`
            : groups.length > 1
              ? `전체 그룹 저장 (${groups.length}개)`
              : '패턴 세트 저장'}
        </button>
      </div>
    </div>
  );
}
