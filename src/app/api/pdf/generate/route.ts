import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import {
  buildUnifiedHtml,
  buildFilename,
  type PdfData,
  type PdfMode,
} from "@/lib/pdf/generate";
import type { ImageSlot } from "@/types/passages";

export const maxDuration = 60;

// /uploads/... 상대 경로를 base64 data URL로 변환 (서버 전용)
// page.setContent()는 baseURL이 없고 file:// URL은 Chromium 보안 정책에 막히므로
// 이미지를 HTML에 직접 인라인 임베드
function resolveUrl(url: string): string {
  if (url.startsWith("/")) {
    const filePath = path.join(process.cwd(), "public", url);
    try {
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(url).slice(1).toLowerCase();
      const mime =
        ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
        ext === "webp" ? "image/webp" :
        ext === "gif"  ? "image/gif"  : "image/png";
      return `data:${mime};base64,${buffer.toString("base64")}`;
    } catch {
      return url;
    }
  }
  return url;
}

function resolveImageItem(item: string | ImageSlot): string | ImageSlot {
  if (typeof item === "string") return resolveUrl(item);
  return { ...item, url: resolveUrl(item.url) };
}

// PdfData 안의 모든 이미지 URL을 base64로 변환
function resolveAllImages(data: PdfData): PdfData {
  return {
    ...data,
    passageImageUrls: data.passageImageUrls?.map(resolveImageItem),
    passages: data.passages?.map((p) => ({
      ...p,
      imageUrls: p.imageUrls?.map(resolveImageItem),
    })),
  };
}

export async function POST(request: NextRequest) {
  const { data, mode }: { data: PdfData; mode: PdfMode } = await request.json();

  const resolvedData = resolveAllImages(data);
  const html = buildUnifiedHtml(resolvedData, mode);
  const filename = buildFilename(data, mode);

  // 헤더 텍스트 (XSS 방지용 간단 escape)
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const headerArea = esc(data.area ? `${data.area} 영역` : "국어 영역");
  const headerMeta = esc([data.school, data.grade].filter(Boolean).join("  "));

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
      margin: { top: "12mm", right: "0", bottom: "10mm", left: "0" },
      displayHeaderFooter: true,
      headerTemplate: `<div style="
          font-family:'Apple SD Gothic Neo','Malgun Gothic','맑은 고딕','Noto Sans KR',sans-serif;
          font-size:7.5pt;color:#333;line-height:1.3;
          width:100%;padding:4px 14mm 4px;box-sizing:border-box;
          display:flex;justify-content:space-between;align-items:center;
          border-bottom:1px solid #aaa;">
        <span>${headerArea}</span>
        <span style="letter-spacing:0.3px;">${headerMeta}</span>
      </div>`,
      footerTemplate: `<div style="font-size:8.5pt;color:#555;width:100%;
        padding:3px 14mm 0;box-sizing:border-box;
        border-top:1px solid #bbb;text-align:center;">
        - <span class="pageNumber"></span> -
      </div>`,
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
