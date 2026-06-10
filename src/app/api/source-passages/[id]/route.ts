import { NextRequest, NextResponse } from 'next/server';
import { getDb, parseJSON, stringifyJSON } from '@/lib/db';

function parsePassageRow(row: Record<string, unknown>) {
  return {
    ...row,
    candidate_question_points: parseJSON(row.candidate_question_points as string, []),
    image_urls: parseJSON(row.image_urls as string, []),
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const row = db.prepare('SELECT * FROM source_passages WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return NextResponse.json({ error: '찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json({ passage: parsePassageRow(row) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '조회 실패' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await request.json();
    const {
      title, area, source_type, passage_text, ocr_raw_text,
      analysis_summary, key_points, candidate_question_points, image_urls,
    } = body;

    const row = db.prepare('SELECT id FROM source_passages WHERE id = ?').get(id);
    if (!row) return NextResponse.json({ error: '찾을 수 없습니다.' }, { status: 404 });

    const updates: string[] = [];
    const values: unknown[] = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (area !== undefined) { updates.push('area = ?'); values.push(area); }
    if (source_type !== undefined) { updates.push('source_type = ?'); values.push(source_type); }
    if (passage_text !== undefined) { updates.push('passage_text = ?'); values.push(passage_text); }
    if (ocr_raw_text !== undefined) { updates.push('ocr_raw_text = ?'); values.push(ocr_raw_text); }
    if (analysis_summary !== undefined) { updates.push('analysis_summary = ?'); values.push(analysis_summary); }
    if (key_points !== undefined) { updates.push('key_points = ?'); values.push(key_points); }
    if (candidate_question_points !== undefined) { updates.push('candidate_question_points = ?'); values.push(stringifyJSON(candidate_question_points)); }
    if (image_urls !== undefined) { updates.push('image_urls = ?'); values.push(stringifyJSON(image_urls)); }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(id);
      db.prepare(`UPDATE source_passages SET ${updates.join(', ')} WHERE id = ?`).run(...values);
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
    db.transaction(() => {
      db.prepare('DELETE FROM question_sets WHERE source_passage_id = ?').run(id);
      db.prepare('DELETE FROM source_passages WHERE id = ?').run(id);
    })();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '삭제 실패' }, { status: 500 });
  }
}
