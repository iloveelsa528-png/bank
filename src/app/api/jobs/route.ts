import { NextResponse } from 'next/server';
import { listJobs } from '@/lib/jobs/store';

export async function GET() {
  try {
    const jobs = listJobs();
    return NextResponse.json({ jobs });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'job 조회 실패' }, { status: 500 });
  }
}
