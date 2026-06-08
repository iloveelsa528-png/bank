"use client";

import { AppProvider, useAppContext } from "@/context/AppContext";
import ImageUploader from "@/components/ImageUploader";
import OCREditor from "@/components/OCREditor";

function MainContent() {
  const {
    uploadedImage,
    editedOcrText,
    isOcrLoading,
    isOcrComplete,
    setOcrRawText,
    setEditedOcrText,
    setIsOcrLoading,
    setIsOcrComplete,
  } = useAppContext();

  const canRunOcr = !!uploadedImage && !isOcrLoading;
  const canComplete = editedOcrText.trim().length > 0 && !isOcrLoading;

  const handleOcrRun = async () => {
    if (!uploadedImage) return;

    setIsOcrLoading(true);
    setIsOcrComplete(false);

    try {
      const formData = new FormData();
      formData.append("image", uploadedImage);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `OCR 요청 실패 (${response.status})`);
      }

      const data = await response.json();
      const text: string = data.text ?? "";
      setOcrRawText(text);
      setEditedOcrText(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      alert(`OCR 실행 중 오류가 발생했습니다:\n${message}`);
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleComplete = () => {
    if (!canComplete) return;
    setIsOcrComplete(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">국어 문제은행</h1>
            <p className="text-xs text-gray-500 -mt-0.5">시험지 OCR</p>
          </div>

          {/* 단계 표시 */}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                1
              </div>
              <span className="text-sm font-medium text-blue-600">이미지 업로드 &amp; OCR</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className="flex items-center gap-1.5 opacity-40">
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 text-xs font-bold">
                2
              </div>
              <span className="text-sm text-gray-400">지문/문제 분석</span>
            </div>
          </div>
        </div>
      </header>

      {/* 완료 배너 */}
      {isOcrComplete && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 text-green-700">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">
              OCR 텍스트가 준비되었습니다. 다음 단계에서 분석을 진행하세요.
            </span>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 flex flex-col gap-6">
        {/* 2컬럼 레이아웃 */}
        <div className="flex gap-6 flex-1">
          {/* 왼쪽: 이미지 업로더 (약 45%) */}
          <div className="w-[45%] flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col">
            <ImageUploader />
          </div>

          {/* 오른쪽: OCR 에디터 (약 55%) */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col">
            <OCREditor />
          </div>
        </div>

        {/* 하단 버튼 영역 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between gap-4">
          {/* 안내 텍스트 */}
          <p className="text-sm text-gray-500">
            {!uploadedImage
              ? "시험지 이미지를 업로드하고 OCR을 실행하세요."
              : isOcrLoading
              ? "OCR 분석 중입니다. 잠시 기다려주세요..."
              : editedOcrText
              ? "텍스트를 확인·수정한 후 수정 완료 버튼을 눌러주세요."
              : "이미지가 업로드되었습니다. OCR을 실행하세요."}
          </p>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* OCR 실행 버튼 */}
            <button
              onClick={handleOcrRun}
              disabled={!canRunOcr}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                transition-all duration-200
                ${
                  canRunOcr
                    ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm hover:shadow"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              {isOcrLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                  OCR 실행 중...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  OCR 실행
                </>
              )}
            </button>

            {/* 수정 완료 버튼 */}
            <button
              onClick={handleComplete}
              disabled={!canComplete}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                transition-all duration-200
                ${
                  canComplete
                    ? isOcrComplete
                      ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200"
                      : "bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm hover:shadow"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isOcrComplete ? "완료됨" : "수정 완료"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
