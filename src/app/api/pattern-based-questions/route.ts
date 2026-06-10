import { NextRequest, NextResponse } from 'next/server';
import { getDb, parseJSON, stringifyJSON } from '@/lib/db';
import { randomUUID } from 'crypto';
import type { PatternBasedQuestion } from '@/types/pattern-remix';

function buildQuestionSet(row: Record<string, unknown>, db: ReturnType<typeof getDb>) {
  const ps = db.prepare('SELECT title, school_name, grade FROM pattern_sets WHERE id = ?').get(row.pattern_set_id as string) as Record<string, unknown> | undefined;
  const sp = db.prepare('SELECT title, area, passage_text, key_points, image_urls FROM source_passages WHERE id = ?').get(row.source_passage_id as string) as Record<string, unknown> | undefined;
  return {
    ...row,
    generated_questions: parseJSON(row.generated_questions as string, []),
    exam_pattern_sets: ps ?? null,
    source_passages: sp
      ? { ...sp, image_urls: parseJSON(sp.image_urls as string, []) }
      : null,
  };
}

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM question_sets ORDER BY created_at DESC').all() as Record<string, unknown>[];
    return NextResponse.json({ questionSets: rows.map(row => buildQuestionSet(row, db)) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const {
      title, pattern_set_id, source_passage_id,
      generated_questions, difficulty, area, source_job_id,
    }: {
      title: string;
      pattern_set_id: string;
      source_passage_id: string;
      generated_questions: PatternBasedQuestion[];
      difficulty: string;
      area: string;
      source_job_id?: string;
    } = body;

    if (!title?.trim()) return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 });

    const id = randomUUID();
    db.prepare(`
      INSERT INTO question_sets (id, title, pattern_set_id, source_passage_id, generated_questions, difficulty, area, source_job_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title.trim(),
      pattern_set_id,
      source_passage_id,
      stringifyJSON(generated_questions ?? []),
      difficulty ?? '',
      area ?? '',
      source_job_id ?? null,
    );

    return NextResponse.json({ id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '저장 실패' }, { status: 500 });
  }
}
