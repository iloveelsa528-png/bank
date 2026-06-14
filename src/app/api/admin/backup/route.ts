import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import path from 'path';
import fs from 'fs';
import os from 'os';

// GET /api/admin/backup — DB 백업 파일 다운로드 (admin 전용)
//
// WAL checkpoint + 파일 복사 대신 better-sqlite3의 db.backup()을 사용.
// 이유: SQLite Online Backup API가 checkpoint 완료 ~ 파일 읽기 사이의 쓰기 누락 없이
//       단일 일관된 스냅샷을 보장하기 때문.
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
  }

  const filename = buildFilename();
  const tempPath = path.join(os.tmpdir(), filename);

  try {
    const db = getDb();
    await db.backup(tempPath);

    const buffer = fs.readFileSync(tempPath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    console.error('[backup] DB 백업 실패:', err);
    return NextResponse.json({ error: 'DB 백업 중 오류가 발생했습니다.' }, { status: 500 });
  } finally {
    try { fs.unlinkSync(tempPath); } catch { /* 임시 파일 없으면 무시 */ }
  }
}

function buildFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const y  = now.getUTCFullYear();
  const mo = pad(now.getUTCMonth() + 1);
  const d  = pad(now.getUTCDate());
  const h  = pad(now.getUTCHours());
  const mi = pad(now.getUTCMinutes());
  const s  = pad(now.getUTCSeconds());
  return `exam-maker-backup-${y}${mo}${d}-${h}${mi}${s}.db`;
}
