"use client";

import React, { useState, useRef } from "react";
import type { CandidateQuestionPoint, ImageSlot } from "@/types/passages";

export interface EditorPanelProps {
  passageText: string;
  analysisSummary: string;
  keyPoints: string;
  candidatePoints: CandidateQuestionPoint[];
  title: string;
  saving: boolean;
  initialImageSlots?: ImageSlot[];
  onSave: (editedText: string, editedTitle: string, imageSlots: ImageSlot[]) => void;
  onBack: () => void;
}

// editedText 안의 [그림A] 토큰에서 슬롯 ID(대문자)를 순서대로 추출 (중복 제거)
function detectSlotIds(text: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of text.matchAll(/\[그림([A-Za-z])\]/g)) {
    const id = m[1].toUpperCase();
    if (!seen.has(id)) { seen.add(id); result.push(id); }
  }
  return result;
}

// 아직 사용되지 않은 다음 알파벳 슬롯 ID 반환
function nextSlotLetter(existingIds: string[]): string {
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    if (!existingIds.includes(ch)) return ch;
  }
  return "A";
}

export default function EditorPanel({
  passageText,
  title,
  saving,
  initialImageSlots,
  onSave,
  onBack,
}: EditorPanelProps) {
  const [editedText,  setEditedText]  = useState(passageText);
  const [editedTitle, setEditedTitle] = useState(title);
  const [imageSlots,  setImageSlots]  = useState<ImageSlot[]>(initialImageSlots ?? []);
  const [uploading,   setUploading]   = useState<Record<string, boolean>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const detectedIds = detectSlotIds(editedText);
  const slotUrlMap  = new Map(imageSlots.map(s => [s.id.toUpperCase(), s.url]));

  // 다음 알파벳 토큰을 textarea 커서 위치(없으면 끝)에 삽입
  const handleAddSlot = () => {
    const letter = nextSlotLetter(detectedIds);
    const token  = `[그림${letter}]`;
    const ta     = textareaRef.current;
    if (ta) {
      const pos     = ta.selectionStart ?? editedText.length;
      const newText = editedText.slice(0, pos) + token + editedText.slice(pos);
      setEditedText(newText);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = pos + token.length;
        ta.focus();
      });
    } else {
      setEditedText(prev => `${prev}\n\n${token}`);
    }
  };

  // 파일 선택 → 업로드 API → 슬롯 URL 저장
  const handleUpload = async (slotId: string, file: File) => {
    setUploading(prev => ({ ...prev, [slotId]: true }));
    try {
      const form = new FormData();
      form.append("file",   file);
      form.append("slotId", slotId);
      const res  = await fetch("/api/uploads/passage-image", { method: "POST", body: form });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "업로드 실패");
      setImageSlots(prev => [
        ...prev.filter(s => s.id.toUpperCase() !== slotId),
        { id: slotId, url: data.url! },
      ]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(prev => ({ ...prev, [slotId]: false }));
    }
  };

  // 슬롯 URL 제거 (텍스트 안 토큰은 유지)
  const handleRemoveImage = (slotId: string) => {
    setImageSlots(prev => prev.filter(s => s.id.toUpperCase() !== slotId));
  };

  return (
    <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-4 flex flex-col gap-4">

      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <p className="text-sm font-bold text-gray-800">저장 전 편집</p>
        <span className="text-xs text-gray-400">OCR 오류 수정 및 그림 자리 추가 후 저장하세요</span>
      </div>

      {/* 제목 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">제목</label>
        <input
          value={editedTitle}
          onChange={e => setEditedTitle(e.target.value)}
          placeholder="지문 제목 (비워두면 자동 생성)"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
        />
      </div>

      {/* 지문 텍스트 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-500">지문 텍스트</label>
          <span className="text-xs text-gray-400">{editedText.length.toLocaleString()}자</span>
        </div>
        <textarea
          ref={textareaRef}
          value={editedText}
          onChange={e => setEditedText(e.target.value)}
          rows={18}
          className="w-full resize-y border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 leading-relaxed focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 whitespace-pre-wrap"
        />

        {/* ── 그림 슬롯 UI (IMAGE_SLOT) ───────────────────────────────────── */}
        <div className="flex flex-col gap-2 border border-gray-100 rounded-xl p-3 bg-gray-50">

          {/* 헤더 행: 레이블 + 항상 보이는 추가 버튼 */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              그림 자리
              {detectedIds.length > 0 && (
                <span className="ml-1 text-blue-500">{detectedIds.length}개 감지됨</span>
              )}
            </span>
            <button
              type="button"
              onClick={handleAddSlot}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              [그림] 자리 추가
            </button>
          </div>

          {/* 감지된 슬롯 목록 */}
          {detectedIds.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-1">
              텍스트에 [그림A] 형식의 토큰이 없습니다. 위 버튼으로 추가하세요.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {detectedIds.map(id => {
                const url        = slotUrlMap.get(id);
                const isUploading = uploading[id];
                return (
                  <div key={id}
                    className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-gray-200">

                    {/* 슬롯 레이블 */}
                    <span className="flex-shrink-0 w-14 text-xs font-bold text-gray-700 font-mono">
                      [그림{id}]
                    </span>

                    {url ? (
                      /* 업로드 완료 — 썸네일 + 제거 버튼 */
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`그림${id}`}
                          className="h-12 w-auto rounded-lg border border-gray-200 object-contain flex-shrink-0"
                        />
                        <span className="flex-1 text-xs text-gray-500 truncate">{url.split("/").pop()}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(id)}
                          className="flex-shrink-0 px-2 py-1 rounded-lg text-xs text-red-500 border border-red-100 hover:bg-red-50 transition-colors"
                        >
                          제거
                        </button>
                      </>
                    ) : (
                      /* 미업로드 — 파일 선택 label */
                      <>
                        <label className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                          isUploading
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-blue-50 text-blue-600 border border-dashed border-blue-200 hover:bg-blue-100"
                        }`}>
                          {isUploading ? (
                            <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg> 업로드 중…</>
                          ) : (
                            <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                            </svg> 이미지 선택</>
                          )}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            disabled={isUploading}
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleUpload(id, file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* ── /그림 슬롯 UI ───────────────────────────────────────────────── */}
      </div>

      {/* 하단 버튼 */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          ← 다시 분석
        </button>
        <button
          type="button"
          onClick={() => onSave(editedText, editedTitle, imageSlots)}
          disabled={saving || !editedText.trim()}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            saving || !editedText.trim()
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700 shadow-sm"
          }`}
        >
          {saving ? "저장 중…" : "저장하기 →"}
        </button>
      </div>
    </div>
  );
}
