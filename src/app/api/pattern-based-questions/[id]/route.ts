import { NextRequest, NextResponse } from 'next/server';
import { getDb, parseJSON, stringifyJSON } from '@/lib/db';

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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const row = db.prepare('SELECT * FROM question_sets WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return NextResponse.json({ error: '찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json({ questionSet: buildQuestionSet(row, db) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '조회 실패' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await request.json();
    const { title, generated_questions, difficulty, area } = body;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (generated_questions !== undefined) { updates.push('generated_questions = ?'); values.push(stringifyJSON(generated_questions)); }
    if (difficulty !== undefined) { updates.push('difficulty = ?'); values.push(difficulty); }
    if (area !== undefined) { updates.push('area = ?'); values.push(area); }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(id);
      db.prepare(`UPDATE question_sets SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '수정 실패' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    db.prepare('DELETE FROM question_sets WHERE id = ?').run(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '삭제 실패' }, { status: 500 });
  }
}
