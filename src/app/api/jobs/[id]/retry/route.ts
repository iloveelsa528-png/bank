import { NextRequest, NextResponse } from 'next/server';
import { getJob, resetJob } from '@/lib/jobs/store';
import { runExamPipeline } from '@/lib/processing/exam';
import { runPassagePipeline } from '@/lib/processing/passage';
import { runQuestionsPipeline } from '@/lib/processing/questions';
import type { GeneratePattern } from '@/lib/ai/generate';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = getJob(id);
    if (!job) return NextResponse.json({ error: 'job not found' }, { status: 404 });

    resetJob(id);
    const payload = job.payload as Record<string, unknown>;

    if (job.type === 'exam_ocr_analyze') {
      const imagePaths = payload.imagePaths as string[];
      runExamPipeline(id, imagePaths).catch(err => console.error('[retry exam]', err));
    } else if (job.type === 'passage_analyze') {
      const { passageText, area, sourceType } = payload as {
        passageText: string; area: string; sourceType: string;
      };
      runPassagePipeline(id, passageText, area, sourceType).catch(err =>
        console.error('[retry passage]', err),
      );
    } else if (job.type === 'question_generate') {
      const { patterns, passageText, passageTitle, passageArea, passageKeyPoints } = payload as {
        patterns: GeneratePattern[];
        passageText: string;
        passageTitle: string;
        passageArea: string;
        passageKeyPoints: string;
      };
      runQuestionsPipeline(id, patterns, passageText, passageTitle, passageArea, passageKeyPoints).catch(
        err => console.error('[retry questions]', err),
      );
    } else {
      return NextResponse.json({ error: `알 수 없는 job 타입: ${job.type}` }, { status: 400 });
    }

    return NextResponse.json({ job: getJob(id) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'retry 실패' }, { status: 500 });
  }
}
