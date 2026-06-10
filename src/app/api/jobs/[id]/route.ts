import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs/store';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = getJob(id);
    if (!job) return NextResponse.json({ error: 'job not found' }, { status: 404 });
    return NextResponse.json({ job });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'job 조회 실패' }, { status: 500 });
  }
}
