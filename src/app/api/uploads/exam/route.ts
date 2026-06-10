import { NextRequest, NextResponse } from 'next/server';
import { createExamOcrJob } from '@/lib/jobs/driver';
import fs from 'fs/promises';
import path from 'path';

function extractMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return '업로드 실패';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageCount = Number(formData.get('imageCount') ?? '0');

    const files: File[] = [];
    for (let i = 0; i < imageCount; i++) {
      const file = formData.get(`image_${i}`);
      if (file instanceof File) files.push(file);
    }

    if (files.length === 0) {
      return NextResponse.json({ error: '이미지 파일이 없습니다.' }, { status: 400 });
    }
    if (files.length > 10) {
      return NextResponse.json({ error: '최대 10장까지 업로드 가능합니다.' }, { status: 400 });
    }

    const uploadFolderId = crypto.randomUUID();
    const folderPath = path.join(process.cwd(), 'public', 'uploads', 'exam', uploadFolderId);
    await fs.mkdir(folderPath, { recursive: true });

    const localPaths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = path.extname(file.name) || '.jpg';
      const filename = `${i}${ext}`;
      const filePath = path.join(folderPath, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      localPaths.push(path.join('public', 'uploads', 'exam', uploadFolderId, filename));
    }

    const job = createExamOcrJob(localPaths, uploadFolderId);
    console.log('[POST /api/uploads/exam] job created:', job.id, 'files:', localPaths.length);

    return NextResponse.json({ jobId: job.id, paths: localPaths });
  } catch (err) {
    console.error('[POST /api/uploads/exam] error:', err);
    return NextResponse.json({ error: extractMsg(err) }, { status: 500 });
  }
}
