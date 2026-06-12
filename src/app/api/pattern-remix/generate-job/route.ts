import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createQuestionGenerateJob } from '@/lib/jobs/driver';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // 배열(pattern_set_ids) 또는 단일(pattern_set_id) 모두 허용
  const ids: string[] = Array.isArray(body.pattern_set_ids)
    ? body.pattern_set_ids
    : body.pattern_set_id
      ? [body.pattern_set_id]
      : [];

  const { source_passage_id } = body;
  if (ids.length === 0 || !source_passage_id) {
    return NextResponse.json({ error: '패턴 세트와 지문을 선택하세요.' }, { status: 400 });
  }

  const db = getDb();

  // 선택된 모든 패턴 세트에서 패턴 수집 (순서 유지)
  const allPatterns: Record<string, unknown>[] = [];
  for (const id of ids) {
    const patterns = db.prepare(
      'SELECT * FROM exam_patterns WHERE pattern_set_id = ? ORDER BY question_number'
    ).all(id) as Record<string, unknown>[];
    allPatterns.push(...patterns);
  }
  if (allPatterns.length === 0) {
    return NextResponse.json({ error: '선택된 패턴 세트에 추출된 패턴이 없습니다.' }, { status: 400 });
  }

  // 원하는 문항 수만큼 패턴을 순환 확장 (기본: 패턴 수)
  const questionCount = typeof body.question_count === 'number' && body.question_count > 0
    ? Math.min(Math.floor(body.question_count), 30)
    : allPatterns.length;
  const finalPatterns: Record<string, unknown>[] = Array.from(
    { length: questionCount },
    (_, i) => allPatterns[i % allPatterns.length],
  );

  // 첫 번째 패턴 세트가 존재하는지 확인 (제목 등 메타데이터용)
  const firstPatternSet = db.prepare('SELECT * FROM pattern_sets WHERE id = ?').get(ids[0]) as Record<string, unknown> | undefined;
  if (!firstPatternSet) {
    return NextResponse.json({ error: '패턴 세트를 찾을 수 없습니다.' }, { status: 404 });
  }

  const passage = db.prepare(
    'SELECT id, title, area, source_type, passage_text, key_points, analysis_summary, candidate_question_points FROM source_passages WHERE id = ?'
  ).get(source_passage_id) as Record<string, unknown> | undefined;
  if (!passage) return NextResponse.json({ error: '지문을 찾을 수 없습니다.' }, { status: 404 });
  if (!(passage.passage_text as string)?.trim()) {
    return NextResponse.json({ error: '지문 텍스트가 없습니다.' }, { status: 400 });
  }

  // candidate_question_points는 JSON 배열 → 텍스트로 변환
  let candidatePointsText = '';
  try {
    const pts = JSON.parse((passage.candidate_question_points as string) || '[]') as Array<{ element: string; description: string; question_type: string }>;
    if (pts.length > 0) {
      candidatePointsText = pts.map(p => `- ${p.element} (${p.question_type}): ${p.description}`).join('\n');
    }
  } catch { /* ignore parse errors */ }

  const genreAdaptation = typeof body.genre_adaptation === 'boolean' ? body.genre_adaptation : true;

  const job = createQuestionGenerateJob(
    finalPatterns as unknown as Parameters<typeof createQuestionGenerateJob>[0],
    passage.passage_text as string,
    passage.title as string,
    (passage.area as string) ?? '',
    (passage.key_points as string) ?? '',
    (passage.analysis_summary as string) ?? '',
    candidatePointsText,
    genreAdaptation,
  );

  return NextResponse.json({ jobId: job.id });
}
