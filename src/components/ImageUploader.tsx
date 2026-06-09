"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp";

export default function ImageUploader() {
  const {
    uploadedImages,
    imagePreviewUrls,
    setUploadedImages,
    setImagePreviewUrls,
    resetImage,
  } = useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const validFiles = newFiles.filter((file) => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          alert(`"${file.name}"은(는) 지원하지 않는 형식입니다. JPG, PNG, WEBP만 업로드 가능합니다.`);
          return false;
        }
        return true;
      });
      if (validFiles.length === 0) return;

      const newUrls = validFiles.map((file) => URL.createObjectURL(file));
      setUploadedImages([...uploadedImages, ...validFiles]);
      setImagePreviewUrls([...imagePreviewUrls, ...newUrls]);
    },
    [uploadedImages, imagePreviewUrls, setUploadedImages, setImagePreviewUrls]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(Array.from(files));
    }
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
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addFiles(Array.from(files));
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteOne = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    const newImages = uploadedImages.filter((_, i) => i !== index);
    const newUrls = imagePreviewUrls.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    setImagePreviewUrls(newUrls);
  };

  const handleResetAll = () => {
    resetImage();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
        이미지 업로드
      </h2>

      {uploadedImages.length === 0 ? (
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
            <p className="text-sm text-gray-400 mt-1">JPG, PNG, WEBP 지원 · 여러 장 동시 선택 가능</p>
          </div>
        </div>
      ) : (
        /* 썸네일 그리드 영역 */
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {/* 드래그&드롭 오버레이 */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              flex-1 overflow-y-auto rounded-xl border-2 transition-colors duration-200
              ${isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50"}
            `}
          >
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <p className="text-blue-600 font-semibold text-base bg-white/80 px-4 py-2 rounded-lg shadow">
                  여기에 놓으세요!
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 p-3">
              {uploadedImages.map((file, index) => (
                <div
                  key={index}
                  className="relative rounded-lg overflow-hidden bg-white border border-gray-200 shadow-sm group"
                >
                  {/* 썸네일 이미지 */}
                  <div className="relative aspect-[4/3] bg-gray-100">
                    <Image
                      src={imagePreviewUrls[index]}
                      alt={`페이지 ${index + 1}`}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>

                  {/* 페이지 번호 배지 */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs font-medium px-2 py-1 truncate">
                    {index + 1}페이지 · {file.name}
                  </div>

                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => handleDeleteOne(index)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    title={`${index + 1}페이지 삭제`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 하단 버튼 영역 */}
          <div className="flex items-center justify-between gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400">{uploadedImages.length}장 업로드됨</span>
            <div className="flex items-center gap-2">
              {/* 파일 추가 버튼 */}
              <button
                onClick={handleClickUpload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                파일 추가
              </button>

              {/* 전체 삭제 버튼 */}
              <button
                onClick={handleResetAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                전체 삭제
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        multiple
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
