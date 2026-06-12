import { NextRequest, NextResponse } from "next/server";
import {
  buildUnifiedHtml,
  buildFilename,
  type PdfData,
  type PdfMode,
} from "@/lib/pdf/generate";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { data, mode }: { data: PdfData; mode: PdfMode } = await request.json();

  const html = buildUnifiedHtml(data, mode);
  const filename = buildFilename(data, mode);

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    // 폰트 렌더링 대기
    await page.waitForTimeout(300);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    await page.close();

    return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } finally {
    await browser.close();
  }
}
