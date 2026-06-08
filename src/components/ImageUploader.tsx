"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.pdf";

export default function ImageUploader() {
  const { uploadedImage, imagePreviewUrl, setUploadedImage, setImagePreviewUrl, resetImage } =
    useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        alert("JPG, PNG, WEBP, PDF 파일만 업로드 가능합니다.");
        return;
      }
      // 이전 URL 해제
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      const previewUrl = URL.createObjectURL(file);
      setUploadedImage(file);
      setImagePreviewUrl(previewUrl);
    },
    [imagePreviewUrl, setUploadedImage, setImagePreviewUrl]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // 같은 파일 재선택 허용
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    resetImage();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isPdf = uploadedImage?.type === "application/pdf";

  return (
    <div className="flex flex-col gap-3 h-full">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
        이미지 업로드
      </h2>

      {!uploadedImage ? (
        /* 업로드 영역 */
        <div
          onClick={handleClickUpload}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            flex-1 min-h-64 flex flex-col items-center justify-center gap-4
            border-2 border-dashed rounded-xl cursor-pointer
            transition-colors duration-200
            ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
            }
          `}
        >
          {/* 아이콘 */}
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              isDragging ? "bg-blue-100" : "bg-gray-100"
            }`}
          >
            <svg
              className={`w-8 h-8 ${isDragging ? "text-blue-500" : "text-gray-400"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>

          <div className="text-center px-4">
            <p className={`text-base font-medium ${isDragging ? "text-blue-600" : "text-gray-600"}`}>
              {isDragging ? "여기에 놓으세요!" : "이미지를 드래그하거나 클릭하여 업로드"}
            </p>
            <p className="text-sm text-gray-400 mt-1">JPG, PNG, WEBP, PDF 지원</p>
          </div>
        </div>
      ) : (
        /* 미리보기 영역 */
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex-1 relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200 min-h-64">
            {isPdf ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500">
                <svg className="w-16 h-16 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
                </svg>
                <p className="text-sm font-medium">{uploadedImage.name}</p>
                <p className="text-xs text-gray-400">
                  {(uploadedImage.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              imagePreviewUrl && (
                <Image
                  src={imagePreviewUrl}
                  alt="업로드된 이미지 미리보기"
                  fill
                  className="object-contain"
                  unoptimized
                />
              )
            )}
          </div>

          {/* 파일 정보 + 변경 버튼 */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{uploadedImage.name}</p>
              <p className="text-xs text-gray-400">
                {(uploadedImage.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={handleReset}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              이미지 변경
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
