import {
  buildPdfSections,
  buildFilename,
  type PdfData,
  type PdfMode,
} from "./generate";

// ─── TXT 다운로드 ─────────────────────────────────────────────────────────────
export function downloadTxt(data: PdfData) {
  const lines: string[] = [];
  lines.push(`=== ${data.title} ===`);
  const meta = [data.school, data.grade, data.area].filter(Boolean).join(" ");
  if (meta) lines.push(meta);
  lines.push("");

  if (data.passageText) {
    lines.push("[ 지문 ]");
    if (data.passageTitle) lines.push(`제목: ${data.passageTitle}`);
    lines.push("");
    lines.push(data.passageText);
    lines.push("");
  }

  lines.push("[ 문제 ]");
  lines.push("");
  for (const q of data.questions) {
    lines.push(
      `${q.question_number}. [${q.question_type}·${q.difficulty}] ${q.question_text}`
    );
    for (const c of q.choices) {
      const mark = c.is_correct ? "★" : " ";
      lines.push(`  ${mark}${c.number}) ${c.text}`);
    }
    if (q.answer === 0) lines.push("  (서술형)");
    lines.push("");
  }

  const objQuestions = data.questions.filter((q) => q.answer > 0);
  if (objQuestions.length > 0) {
    lines.push("[ 정답 ]");
    lines.push(
      objQuestions.map((q) => `${q.question_number}번: ${q.answer}`).join("  ")
    );
    lines.push("");
  }

  lines.push("[ 해설 ]");
  lines.push("");
  for (const q of data.questions) {
    lines.push(`${q.question_number}번 (${q.question_type})`);
    if (q.answer > 0) lines.push(`정답: ${q.answer}번`);
    if (q.explanation) lines.push(`해설: ${q.explanation}`);
    if (q.answer === 0 && q.descriptive_answer)
      lines.push(`모범답안: ${q.descriptive_answer}`);
    lines.push("");
  }

  const filename = buildFilename(data, "teacher").replace(".pdf", ".txt");
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF 다운로드 ─────────────────────────────────────────────────────────────
// 각 섹션(헤더·지문·문제)을 개별 렌더링 후 조립 → 문제 중간 페이지 단절 없음
export async function downloadPdf(data: PdfData, mode: PdfMode) {
  const { jsPDF } = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");

  const CONTAINER_W = 794;
  const SCALE = 2;

  // HTML 섹션 → canvas
  async function renderToCanvas(html: string): Promise<HTMLCanvasElement> {
    const el = document.createElement("div");
    el.style.cssText =
      "position:absolute;left:-9999px;top:0;" +
      `width:${CONTAINER_W}px;background:#fff;z-index:99999;` +
      "visibility:visible;overflow:visible;";
    el.innerHTML = html;
    document.body.appendChild(el);

    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => setTimeout(r, 50));

    const canvas = await html2canvas(el, {
      scale: SCALE,
      useCORS: true,
      logging: false,
      width: CONTAINER_W,
      windowWidth: CONTAINER_W,
      backgroundColor: "#ffffff",
    });

    document.body.removeChild(el);
    return canvas;
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PAGE_W  = pdf.internal.pageSize.getWidth();   // 210 mm
  const PAGE_H  = pdf.internal.pageSize.getHeight();  // 297 mm
  const V_MARGIN = 6; // 페이지 상단/하단 여백 (mm)

  // canvas를 픽셀 오프셋 기준으로 잘라내기
  function sliceImgData(
    canvas: HTMLCanvasElement,
    startPx: number,
    endPx: number
  ): string {
    const slice = document.createElement("canvas");
    slice.width  = canvas.width;
    slice.height = endPx - startPx;
    const ctx = slice.getContext("2d")!;
    ctx.drawImage(canvas, 0, -startPx);
    return slice.toDataURL("image/jpeg", 0.95);
  }

  let curY = 0;       // 현재 페이지의 y 위치 (mm)
  let pageCount = 1;

  // 섹션 하나를 페이지에 배치 (섹션이 여러 페이지에 걸칠 수도 있음)
  function placeCanvas(canvas: HTMLCanvasElement) {
    const pxPerMm = canvas.width / PAGE_W; // 1mm = x 픽셀
    const totalMm = canvas.height / pxPerMm;

    // 현재 페이지에 안 들어가면 새 페이지로
    if (pageCount > 1 && curY + totalMm > PAGE_H - V_MARGIN) {
      pdf.addPage();
      pageCount++;
      curY = V_MARGIN;
    }

    let remMm = totalMm;   // 아직 배치 안 된 높이 (mm)
    let startPx = 0;

    while (remMm > 0) {
      const avail = PAGE_H - curY; // 현재 페이지에 남은 공간 (mm)
      const chunkMm = Math.min(remMm, avail);
      const endPx = startPx + chunkMm * pxPerMm;

      const imgData = sliceImgData(canvas, startPx, endPx);
      pdf.addImage(imgData, "JPEG", 0, curY, PAGE_W, chunkMm);

      curY   += chunkMm;
      startPx = endPx;
      remMm  -= chunkMm;

      if (remMm > 0) {
        pdf.addPage();
        pageCount++;
        curY = V_MARGIN;
      }
    }
  }

  const sections = buildPdfSections(data, mode);

  for (const sec of sections) {
    const canvas = await renderToCanvas(sec.html);
    placeCanvas(canvas);
  }

  pdf.save(buildFilename(data, mode));
}
