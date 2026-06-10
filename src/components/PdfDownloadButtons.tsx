"use client";
import { useState } from "react";
import { downloadPdf } from "@/lib/pdf/download";
import type { PdfData, PdfMode } from "@/lib/pdf/generate";

const MODES: { mode: PdfMode; label: string; color: string }[] = [
  { mode: "student", label: "학생용", color: "bg-green-600 hover:bg-green-700" },
  { mode: "teacher", label: "교사용", color: "bg-green-600 hover:bg-green-700" },
  { mode: "full",    label: "전체본", color: "bg-purple-600 hover:bg-purple-700" },
];

export default function PdfDownloadButtons({ data }: { data: PdfData }) {
  const [loading, setLoading] = useState<PdfMode | null>(null);
  const [error, setError] = useState("");

  async function handle(mode: PdfMode) {
    setLoading(mode);
    setError("");
    try {
      await downloadPdf(data, mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF 생성 실패");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        {MODES.map(({ mode, label, color }) => (
          <button
            key={mode}
            onClick={() => handle(mode)}
            disabled={loading !== null}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
          >
            {loading === mode ? (
              <>
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                생성 중…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {label} PDF
              </>
            )}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
