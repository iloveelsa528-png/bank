import { NextRequest, NextResponse } from 'next/server';
import { getDb, parseJSON, stringifyJSON } from '@/lib/db';
import { randomUUID } from 'crypto';
import type { CandidateQuestionPoint, ImageSlot } from '@/types/passages';

function parsePassageRow(row: Record<string, unknown>) {
  return {
    ...row,
    candidate_question_points: parseJSON(row.candidate_question_points as string, []),
    image_urls: parseJSON(row.image_urls as string, []),
  };
}

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM source_passages ORDER BY created_at DESC').all() as Record<string, unknown>[];
    return NextResponse.json({ passages: rows.map(parsePassageRow) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const {
      title, area, source_type, passage_text, ocr_raw_text,
      analysis_summary, key_points, candidate_question_points, image_urls,
    }: {
      title: string; area: string; source_type: string;
      passage_text: string; ocr_raw_text: string;
      analysis_summary: string; key_points: string;
      candidate_question_points: CandidateQuestionPoint[];
      image_urls: (string | ImageSlot)[];
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 });
    }

    const id = randomUUID();
    db.prepare(`
      INSERT INTO source_passages
        (id, title, area, source_type, passage_text, ocr_raw_text,
         analysis_summary, key_points, candidate_question_points, image_urls)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title.trim(),
      area ?? '',
      source_type ?? '',
      passage_text ?? '',
      ocr_raw_text ?? '',
      analysis_summary ?? '',
      key_points ?? '',
      stringifyJSON(candidate_question_points ?? []),
      stringifyJSON(image_urls ?? []),
    );

    return NextResponse.json({ id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '저장 실패' }, { status: 500 });
  }
}
