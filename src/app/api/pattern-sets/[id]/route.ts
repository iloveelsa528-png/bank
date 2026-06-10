import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const row = db.prepare('SELECT * FROM pattern_sets WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return NextResponse.json({ error: '찾을 수 없습니다.' }, { status: 404 });
    const patterns = db.prepare('SELECT * FROM exam_patterns WHERE pattern_set_id = ? ORDER BY question_number').all(id);
    return NextResponse.json({ patternSet: { ...row, exam_patterns: patterns } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '조회 실패' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    db.transaction(() => {
      db.prepare('DELETE FROM question_sets WHERE pattern_set_id = ?').run(id);
      db.prepare('DELETE FROM pattern_sets WHERE id = ?').run(id);
    })();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '삭제 실패' }, { status: 500 });
  }
}
