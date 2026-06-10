import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createQuestionGenerateJob } from '@/lib/jobs/driver';

export async function POST(request: NextRequest) {
  const { pattern_set_id, source_passage_id } = await request.json();
  if (!pattern_set_id || !source_passage_id) {
    return NextResponse.json({ error: '패턴 세트와 지문을 선택하세요.' }, { status: 400 });
  }

  const db = getDb();
  const patternSet = db.prepare('SELECT * FROM pattern_sets WHERE id = ?').get(pattern_set_id) as Record<string, unknown> | undefined;
  if (!patternSet) return NextResponse.json({ error: '패턴 세트를 찾을 수 없습니다.' }, { status: 404 });

  const patterns = db.prepare('SELECT * FROM exam_patterns WHERE pattern_set_id = ? ORDER BY question_number').all(pattern_set_id);
  if (patterns.length === 0) return NextResponse.json({ error: '패턴 세트에 추출된 패턴이 없습니다.' }, { status: 400 });

  const passage = db.prepare('SELECT id, title, area, source_type, passage_text, key_points FROM source_passages WHERE id = ?').get(source_passage_id) as Record<string, unknown> | undefined;
  if (!passage) return NextResponse.json({ error: '지문을 찾을 수 없습니다.' }, { status: 404 });
  if (!(passage.passage_text as string)?.trim()) return NextResponse.json({ error: '지문 텍스트가 없습니다.' }, { status: 400 });

  const job = createQuestionGenerateJob(
    patterns as Parameters<typeof createQuestionGenerateJob>[0],
    passage.passage_text as string,
    passage.title as string,
    (passage.area as string) ?? '',
    (passage.key_points as string) ?? '',
  );

  return NextResponse.json({ jobId: job.id });
}
