import { NextRequest, NextResponse } from 'next/server';
import { cancelJob, getJob } from '@/lib/jobs/store';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!getJob(id)) return NextResponse.json({ error: 'job not found' }, { status: 404 });
    cancelJob(id);
    return NextResponse.json({ job: getJob(id) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'cancel 실패' }, { status: 500 });
  }
}
