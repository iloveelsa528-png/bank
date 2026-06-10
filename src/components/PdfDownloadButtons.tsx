"use client";
import { useState } from "react";
import { downloadPdf, downloadTxt } from "@/lib/pdf/download";
import type { PdfData, PdfMode } from "@/lib/pdf/generate";

const PDF_MODES: { mode: PdfMode; label: string; desc: string }[] = [
  { mode: "student", label: "학생용 PDF", desc: "문제만 (정답·해설 없음)" },
  { mode: "teacher", label: "교사용 PDF", desc: "정답·해설 포함" },
  { mode: "full",    label: "전체본 PDF", desc: "패턴 참조 포함" },
];

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return <span className={`border-2 border-current border-t-transparent rounded-full animate-spin ${className}`} />;
}

// 크게 표시하는 모드 (문제 생성 완료 화면)
function LargeButtons({ data }: { data: PdfData }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handlePdf(mode: PdfMode) {
    setLoading(mode); setError("");
    try { await downloadPdf(data, mode); }
    catch (e) { setError(e instanceof Error ? e.message : "PDF 생성 실패"); }
    finally { setLoading(null); }
  }

  function handleTxt() {
    setLoading("txt"); setError("");
    try { downloadTxt(data); }
    catch (e) { setError(e instanceof Error ? e.message : "TXT 생성 실패"); }
    finally { setLoading(null); }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-bold text-gray-800">파일로 저장하기</p>
      <div className="grid grid-cols-2 gap-2.5">
        {PDF_MODES.map(({ mode, label, desc }) => (
          <button key={mode} onClick={() => handlePdf(mode)} disabled={loading !== null}
            className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-left hover:border-red-300 hover:bg-red-50 transition-all disabled:opacity-50 group">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 group-hover:bg-red-100">
              {loading === mode
                ? <Spinner className="w-4 h-4 opacity-60" />
                : <DownloadIcon className="w-5 h-5 text-red-500" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          </button>
        ))}

        <button onClick={handleTxt} disabled={loading !== null}
          className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-left hover:border-blue-300 hover:bg-blue-50 transition-all disabled:opacity-50 group">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100">
            {loading === "txt"
              ? <Spinner className="w-4 h-4 text-blue-400 border-blue-400" />
              : (
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 leading-tight">텍스트 파일 (TXT)</p>
            <p className="text-xs text-gray-400 mt-0.5">워드·한글에서 편집 가능</p>
          </div>
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// 작게 표시하는 모드 (라이브러리 목록)
function CompactButtons({ data }: { data: PdfData }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handlePdf(mode: PdfMode) {
    setLoading(mode); setError("");
    try { await downloadPdf(data, mode); }
    catch (e) { setError(e instanceof Error ? e.message : "PDF 실패"); }
    finally { setLoading(null); }
  }

  function handleTxt() {
    setLoading("txt"); setError("");
    try { downloadTxt(data); }
    catch (e) { setError(e instanceof Error ? e.message : "TXT 실패"); }
    finally { setLoading(null); }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5 flex-wrap">
        {PDF_MODES.map(({ mode, label }) => (
          <button key={mode} onClick={() => handlePdf(mode)} disabled={loading !== null}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-white text-xs font-medium rounded-lg bg-green-600 hover:bg-green-700 transition disabled:opacity-50">
            {loading === mode
              ? <><Spinner className="w-3 h-3 border-white/40 border-t-white" /> 생성 중…</>
              : <><DownloadIcon className="w-3.5 h-3.5" />{label}</>}
          </button>
        ))}
        <button onClick={handleTxt} disabled={loading !== null}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-white text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50">
          {loading === "txt"
            ? <><Spinner className="w-3 h-3 border-white/40 border-t-white" /> 생성 중…</>
            : <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              TXT
            </>}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function PdfDownloadButtons({ data, large = false }: { data: PdfData; large?: boolean }) {
  return large ? <LargeButtons data={data} /> : <CompactButtons data={data} />;
}
