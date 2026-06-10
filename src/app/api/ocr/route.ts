import { NextRequest, NextResponse } from 'next/server';
import { runOcrChunk } from '@/lib/ai/ocr';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';


export async function POST(request: NextRequest) {
  const tmpFiles: string[] = [];
  try {
    const formData = await request.formData();
    const imageCount = parseInt(formData.get('imageCount') as string ?? '1', 10);

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ocr-'));
    const ocrTexts: string[] = [];

    await Promise.all(
      Array.from({ length: imageCount }, (_, i) => i).map(async (i) => {
        const file = formData.get(`image_${i}`) as File | null;
        if (!file) return;

        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split('.').pop() ?? 'jpg';
        const tmpPath = path.join(tmpDir, `${randomUUID()}.${ext}`);
        tmpFiles.push(tmpPath);
        await fs.writeFile(tmpPath, buffer);

        const result = await runOcrChunk(tmpPath);
        ocrTexts[i] = result.output.text;
      })
    );

    const text = ocrTexts.filter(Boolean).join('\n\n');
    return NextResponse.json({ text });
  } catch (err) {
    console.error('/api/ocr error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'OCR 오류' },
      { status: 500 },
    );
  } finally {
    await Promise.all(tmpFiles.map(f => fs.unlink(f).catch(() => null)));
  }
}
