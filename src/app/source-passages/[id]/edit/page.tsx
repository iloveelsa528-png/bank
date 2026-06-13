"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EditorPanel from "@/components/editor/EditorPanel";
import type { ImageSlot, SourcePassage } from "@/types/passages";

export default function EditPassagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [passage, setPassage] = useState<SourcePassage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Next.js 16: params는 Promise
  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/source-passages/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPassage(data.passage);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "불러오기 실패"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (
    editedText: string,
    editedTitle: string,
    imageSlots: ImageSlot[],
  ) => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/source-passages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editedTitle,
          passage_text: editedText,
          image_urls: imageSlots,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "저장 실패");
      router.push("/source-passages/library");
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <svg className="w-8 h-8 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !passage) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-500">{error ?? "지문을 찾을 수 없습니다."}</p>
        <Link
          href="/source-passages/library"
          className="text-sm text-green-600 hover:underline"
        >
          ← 라이브러리로 돌아가기
        </Link>
      </div>
    );
  }

  // 저장된 image_urls 중 ImageSlot 타입만 초기 슬롯으로 추출
  const initialImageSlots = (passage.image_urls ?? []).filter(
    (item): item is ImageSlot => typeof item !== "string",
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link
            href="/source-passages/library"
            className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">지문 편집</h1>
            <p className="text-xs text-gray-500 -mt-0.5 truncate max-w-xs">{passage.title}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6">
        <EditorPanel
          passageText={passage.passage_text ?? ""}
          analysisSummary={passage.analysis_summary ?? ""}
          keyPoints={passage.key_points ?? ""}
          candidatePoints={passage.candidate_question_points ?? []}
          title={passage.title ?? ""}
          saving={saving}
          initialImageSlots={initialImageSlots}
          onSave={handleSave}
          onBack={() => router.push("/source-passages/library")}
        />
      </main>
    </div>
  );
}
