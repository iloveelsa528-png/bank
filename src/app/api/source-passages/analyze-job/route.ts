import { NextRequest, NextResponse } from 'next/server';
import { createPassageAnalyzeJob } from '@/lib/jobs/driver';

export async function POST(request: NextRequest) {
  const { passage_text, area = '', source_type = '' } = await request.json();
  if (!passage_text?.trim()) {
    return NextResponse.json({ error: '지문 내용이 없습니다.' }, { status: 400 });
  }

  const job = createPassageAnalyzeJob(passage_text, area, source_type);
  return NextResponse.json({ jobId: job.id });
}
