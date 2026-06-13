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

  // 헤더 구성 요소 — 모든 페이지에 동일하게 표시되는 Playwright headerTemplate용
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const area      = esc(data.area ? `${data.area} 영역` : "국어 영역");
  const modeLabel = esc(mode === "student" ? "학생용" : mode === "teacher" ? "교사용" : "전체본");
  const date      = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "-").replace(".", "")
    : new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "-").replace(".", "");
  const topInfoHtml = [data.school, data.grade, date]
    .filter((s): s is string => !!s)
    .map(esc)
    .join("&nbsp;&nbsp;&nbsp;");

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
      // margin.top은 headerTemplate 높이를 수용할 만큼 확보 (헤더 약 22mm + 여유 6mm)
      margin: { top: "28mm", right: "0", bottom: "10mm", left: "0" },
      displayHeaderFooter: true,
      // 수능 스타일 전체 헤더 — 모든 페이지 동일 위치 → 단 높이 균일
      headerTemplate: `<div style="
          font-family:'Apple SD Gothic Neo','Malgun Gothic','맑은 고딕','Noto Sans KR','NanumGothic',sans-serif;
          width:100%;padding:3px 14mm 0;box-sizing:border-box;">
        <p style="font-size:8.5pt;color:#444;text-align:center;margin:0 0 3px;letter-spacing:0.3px;">
          ${topInfoHtml}
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:3px;">
          <tr style="vertical-align:bottom;">
            <td style="font-size:22pt;font-weight:900;letter-spacing:-0.5px;line-height:1.1;color:#000;">
              ${area}
            </td>
            <td style="text-align:right;font-size:9pt;color:#333;padding-bottom:3px;">
              <b style="font-size:10pt;">${modeLabel}</b>
            </td>
          </tr>
        </table>
        <div style="border-top:3.5px solid #000;margin-bottom:2px;"></div>
        <div style="border-top:1px solid #000;"></div>
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
