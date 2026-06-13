import { NextRequest, NextResponse } from 'next/server';
import { createExamOcrJob, createExamTextJob } from '@/lib/jobs/driver';
import { extractTextFromPdf } from '@/lib/pdf/extract-text';
import { pdfToImages } from '@/lib/pdf/pdf-to-images';
import fs from 'fs/promises';
import path from 'path';

function extractMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return '업로드 실패';
}

// ────────────────────────────────────────────────────────────
// PDF 업로드 처리
// ────────────────────────────────────────────────────────────
async function handlePdfUpload(
  file: File,
  folderPath: string,
  uploadFolderId: string,
): Promise<NextResponse> {
  // PDF를 디스크에 저장
  const pdfPath = path.join(folderPath, 'upload.pdf');
  const pdfBuffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(pdfPath, pdfBuffer);

  // 텍스트 추출 시도
  const extracted = await extractTextFromPdf(pdfPath);

  if (extracted.isTextPdf) {
    // ── 텍스트 PDF: OCR 없이 바로 segment → analyze ──────────────
    console.log('[POST /api/uploads/exam] 텍스트 PDF 감지, 텍스트 파이프라인 실행. chars:', extracted.text.length);
    const job = createExamTextJob(extracted.text, uploadFolderId);
    return NextResponse.json({ jobId: job.id, mode: 'text_pdf' });
  }

  // ── 이미지 PDF: 페이지별 PNG 변환 후 OCR 파이프라인 ──────────────
  console.log('[POST /api/uploads/exam] 이미지 PDF 감지, PNG 변환 중. pages:', extracted.pageCount);
  const pageImages = await pdfToImages(pdfPath, { scale: 2.0 });

  if (pageImages.length === 0) {
    return NextResponse.json({ error: 'PDF에서 이미지를 추출할 수 없습니다.' }, { status: 400 });
  }
  if (pageImages.length > 10) {
    return NextResponse.json({ error: 'PDF가 10페이지를 초과합니다. 10페이지 이하로 분리해 주세요.' }, { status: 400 });
  }

  // 변환된 PNG를 같은 폴더에 저장
  const localPaths: string[] = [];
  for (const img of pageImages) {
    const filename = `page-${String(img.pageNumber).padStart(3, '0')}.png`;
    const filePath = path.join(folderPath, filename);
    await fs.writeFile(filePath, img.buffer);
    localPaths.push(path.join('public', 'uploads', 'exam', uploadFolderId, filename));
  }

  console.log('[POST /api/uploads/exam] 이미지 PDF → PNG 변환 완료:', localPaths.length, '장');
  const job = createExamOcrJob(localPaths, uploadFolderId);
  return NextResponse.json({ jobId: job.id, mode: 'image_pdf', paths: localPaths });
}

// ────────────────────────────────────────────────────────────
// 기존 이미지 업로드 처리 (변경 없음)
// ────────────────────────────────────────────────────────────
async function handleImageUpload(
  files: File[],
  folderPath: string,
  uploadFolderId: string,
): Promise<NextResponse> {
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
}

// ────────────────────────────────────────────────────────────
// POST handler
// ────────────────────────────────────────────────────────────
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
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    const uploadFolderId = crypto.randomUUID();
    const folderPath = path.join(process.cwd(), 'public', 'uploads', 'exam', uploadFolderId);
    await fs.mkdir(folderPath, { recursive: true });

    // PDF 단일 파일 업로드 감지
    if (
      files.length === 1 &&
      (files[0].name.toLowerCase().endsWith('.pdf') ||
        files[0].type === 'application/pdf')
    ) {
      return await handlePdfUpload(files[0], folderPath, uploadFolderId);
    }

    // 이미지 파일 (기존 경로 — 변경 없음)
    if (files.length > 10) {
      return NextResponse.json({ error: '최대 10장까지 업로드 가능합니다.' }, { status: 400 });
    }
    return await handleImageUpload(files, folderPath, uploadFolderId);
  } catch (err) {
    console.error('[POST /api/uploads/exam] error:', err);
    return NextResponse.json({ error: extractMsg(err) }, { status: 500 });
  }
}
