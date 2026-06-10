import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { randomUUID } from 'crypto';
import type { ExamPattern } from '@/types/patterns';

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM pattern_sets ORDER BY created_at DESC').all() as Record<string, unknown>[];
    const patternSets = rows.map(row => {
      const patterns = db.prepare('SELECT * FROM exam_patterns WHERE pattern_set_id = ? ORDER BY question_number').all(row.id as string);
      return { ...row, exam_patterns: patterns };
    });
    return NextResponse.json({ patternSets });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { meta, patterns, source_job_id }: {
      meta: Record<string, string>;
      patterns: ExamPattern[];
      source_job_id?: string;
    } = body;

    if (!meta?.title?.trim()) {
      return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 });
    }

    const id = randomUUID();
    db.prepare(`
      INSERT INTO pattern_sets (id, title, school_name, grade, semester, exam_name, area, description, source_job_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      meta.title.trim(),
      meta.school_name ?? '',
      meta.grade ?? '',
      meta.semester ?? '',
      meta.exam_name ?? '',
      meta.area ?? '',
      meta.description ?? '',
      source_job_id ?? null,
    );

    if (patterns.length > 0) {
      const insertPattern = db.prepare(`
        INSERT INTO exam_patterns
          (id, pattern_set_id, question_number, question_type, prompt_style, choice_style,
           answer_basis_type, wrong_choice_pattern, difficulty, intent, uses_reference_box, pattern_summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = db.transaction((ps: ExamPattern[]) => {
        for (const p of ps) {
          insertPattern.run(
            randomUUID(),
            id,
            p.question_number ?? 0,
            p.question_type ?? '',
            p.prompt_style ?? '',
            p.choice_style ?? '',
            p.answer_basis_type ?? '',
            p.wrong_choice_pattern ?? '',
            p.difficulty ?? '',
            p.intent ?? '',
            p.uses_reference_box ? 1 : 0,
            p.pattern_summary ?? '',
          );
        }
      });
      insertMany(patterns);
    }

    return NextResponse.json({ id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '저장 실패' }, { status: 500 });
  }
}
