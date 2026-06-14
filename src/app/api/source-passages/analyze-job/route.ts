import { NextRequest, NextResponse } from 'next/server';
import { createPassageAnalyzeJob } from '@/lib/jobs/driver';
import { getSessionUser } from '@/lib/session';

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { passage_text, area = '', source_type = '' } = await request.json();
  if (!passage_text?.trim()) {
    return NextResponse.json({ error: '지문 내용이 없습니다.' }, { status: 400 });
  }

  const job = createPassageAnalyzeJob(passage_text, area, source_type, sessionUser.id);
  return NextResponse.json({ jobId: job.id });
}
