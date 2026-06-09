"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";

type OcrStatus = "empty" | "waiting" | "loading" | "done";

function getStatus(
  hasImages: boolean,
  isOcrLoading: boolean,
  ocrRawText: string
): OcrStatus {
  if (isOcrLoading) return "loading";
  if (!hasImages) return "empty";
  if (!ocrRawText) return "waiting";
  return "done";
}

const STATUS_CONFIG: Record<OcrStatus, { label: string; color: string; icon: React.ReactNode }> = {
  empty: {
    label: "이미지를 업로드하세요",
    color: "text-gray-400",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
        />
      </svg>
    ),
  },
  waiting: {
    label: "OCR 실행 대기 중",
    color: "text-yellow-600",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  loading: {
    label: "OCR 실행 중...",
    color: "text-blue-600",
    icon: (
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    ),
  },
  done: {
    label: "OCR 완료",
    color: "text-green-600",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
};

export default function OCREditor() {
  const { uploadedImages, ocrRawText, editedOcrText, isOcrLoading, setEditedOcrText } =
    useAppContext();

  const status = getStatus(uploadedImages.length > 0, isOcrLoading, ocrRawText);
  const { label, color, icon } = STATUS_CONFIG[status];

  const isEditable = status === "done" && !isOcrLoading;
  const charCount = editedOcrText.length;

  const placeholderText =
    status === "empty"
      ? "왼쪽에서 이미지를 업로드한 후 OCR을 실행하면\n텍스트가 여기에 표시됩니다."
      : status === "waiting"
      ? "이미지가 업로드되었습니다.\n하단의 'OCR 실행' 버튼을 눌러주세요."
      : status === "loading"
      ? "OCR 분석 중입니다. 잠시 기다려주세요..."
      : "";

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          OCR 텍스트
        </h2>
        {/* 상태 배지 */}
        <span className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
          {icon}
          {label}
        </span>
      </div>

      {/* 텍스트 에디터 */}
      <div className="flex-1 flex flex-col relative">
        <textarea
          value={editedOcrText}
          onChange={(e) => setEditedOcrText(e.target.value)}
          placeholder={placeholderText}
          disabled={!isEditable}
          className={`
            flex-1 w-full min-h-64 p-4 text-sm leading-relaxed rounded-xl border resize-none
            transition-colors duration-200 font-mono
            placeholder:text-gray-400 placeholder:font-sans placeholder:text-center
            ${
              isEditable
                ? "bg-white border-gray-300 text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                : status === "loading"
                ? "bg-blue-50 border-blue-200 text-gray-400 cursor-not-allowed"
                : "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
            }
          `}
          style={{ height: "100%" }}
        />

        {/* 로딩 오버레이 */}
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-blue-50/60">
            <div className="flex flex-col items-center gap-3 text-blue-600">
              <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24">
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
              <span className="text-sm font-medium">OCR 분석 중...</span>
            </div>
          </div>
        )}
      </div>

      {/* 글자 수 */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-gray-400">
          {isEditable ? "텍스트를 직접 수정할 수 있습니다." : ""}
        </p>
        <p className="text-xs text-gray-400">
          {charCount > 0 ? `${charCount.toLocaleString()}자` : ""}
        </p>
      </div>
    </div>
  );
}
