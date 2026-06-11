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

// ─── PDF 다운로드 (2단 컬럼 레이아웃) ────────────────────────────────────────
export async function downloadPdf(data: PdfData, mode: PdfMode) {
  const { jsPDF } = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");

  // ── 페이지 레이아웃 상수 ───────────────────────────────────────────
  const PAGE_W   = 210;   // mm
  const PAGE_H   = 297;   // mm
  const H_MARGIN = 10;    // mm (좌우 여백)
  const V_MARGIN = 12;    // mm (상하 여백)
  const COL_GAP  = 5;     // mm (2단 사이 간격)
  const COL_W    = (PAGE_W - 2 * H_MARGIN - COL_GAP) / 2;  // 92.5mm

  // 각 컬럼의 x 좌표 (mm)
  const COL_X = [H_MARGIN, H_MARGIN + COL_W + COL_GAP] as const;  // [10, 107.5]

  // 렌더링 폭
  const SCALE       = 2;
  const FULL_W_PX   = 794;   // 전체 폭 섹션 (헤더·지문) 렌더 폭
  const COL_W_PX    = Math.round(FULL_W_PX * COL_W / PAGE_W);  // ≈349px

  // ── HTML → canvas ──────────────────────────────────────────────────
  async function renderToCanvas(html: string, containerW: number): Promise<HTMLCanvasElement> {
    const el = document.createElement("div");
    el.style.cssText =
      `position:absolute;left:-9999px;top:0;width:${containerW}px;` +
      `background:#fff;z-index:99999;visibility:visible;overflow:visible;`;
    el.innerHTML = html;
    document.body.appendChild(el);
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => setTimeout(r, 60));
    const canvas = await html2canvas(el, {
      scale: SCALE, useCORS: true, logging: false,
      width: containerW, windowWidth: containerW, backgroundColor: "#ffffff",
    });
    document.body.removeChild(el);
    return canvas;
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── canvas 슬라이스 ────────────────────────────────────────────────
  function sliceImgData(canvas: HTMLCanvasElement, startPx: number, endPx: number): string {
    const h = Math.max(1, endPx - startPx);
    const slice = document.createElement("canvas");
    slice.width  = canvas.width;
    slice.height = h;
    const ctx = slice.getContext("2d")!;
    ctx.drawImage(canvas, 0, -startPx);
    return slice.toDataURL("image/jpeg", 0.95);
  }

  // ── 2단 컬럼 상태 ──────────────────────────────────────────────────
  let curCol = 0;                                          // 0=왼쪽, 1=오른쪽
  let colTop = V_MARGIN;                                   // 현재 페이지 컬럼 시작 y
  let colYs  = [V_MARGIN, V_MARGIN] as [number, number];  // 각 컬럼 현재 y

  // 컬럼 구분선 그리기
  function drawDivider() {
    const lineX = H_MARGIN + COL_W + COL_GAP / 2;
    pdf.setDrawColor(210, 210, 210);
    pdf.setLineWidth(0.25);
    pdf.line(lineX, V_MARGIN, lineX, PAGE_H - V_MARGIN);
  }

  // 새 페이지
  function newPage() {
    pdf.addPage();
    curCol = 0;
    colTop = V_MARGIN;
    colYs  = [V_MARGIN, V_MARGIN];
    drawDivider();
  }

  // 다음 컬럼 (오른쪽 → 새 페이지)
  function nextCol() {
    if (curCol === 0) {
      curCol = 1;
    } else {
      newPage();
    }
  }

  // ── 전체 폭 배치 (헤더·지문) ───────────────────────────────────────
  // 현재 y에서 바로 시작 — 긴 지문도 현재 페이지에서 시작해 슬라이싱
  // (사전 newPage 없음: 사전 newPage가 1페이지 공백 버그의 원인)
  function placeFullWidth(canvas: HTMLCanvasElement) {
    const pxPerMm = canvas.width / PAGE_W;
    const totalMm = canvas.height / pxPerMm;

    let y       = Math.max(colYs[0], colYs[1]);
    let remMm   = totalMm;
    let startPx = 0;

    while (remMm > 0.5) {
      const avail = PAGE_H - V_MARGIN - y;
      if (avail <= 0.5) {
        pdf.addPage();
        y = V_MARGIN;
        drawDivider();
        continue;
      }
      const chunkMm = Math.min(remMm, avail);
      const endPx   = Math.round(startPx + chunkMm * pxPerMm);

      pdf.addImage(
        sliceImgData(canvas, Math.round(startPx), endPx),
        "JPEG", 0, y, PAGE_W, chunkMm
      );

      y       += chunkMm;
      startPx  = endPx;
      remMm   -= chunkMm;

      if (remMm > 0.5) {
        pdf.addPage();
        y = V_MARGIN;
        drawDivider();
      }
    }

    // 두 컬럼 모두 이 섹션 바로 아래에서 시작
    colTop = y;
    colYs  = [y, y];
    curCol = 0;
  }

  // ── 컬럼 배치 (문제) ───────────────────────────────────────────────
  // 현재 컬럼에 안 들어가면 다음 컬럼으로, 새 페이지로 자동 전환
  function placeInColumn(canvas: HTMLCanvasElement) {
    const pxPerMm = canvas.width / COL_W;
    const totalMm = canvas.height / pxPerMm;

    // 섹션이 컬럼 안에 들어갈 크기이고, 현재 컬럼에 내용이 있고, 안 들어가면 → 다음 컬럼
    const maxColH  = PAGE_H - 2 * V_MARGIN;  // 273mm
    const colAvail = PAGE_H - V_MARGIN - colYs[curCol];
    if (totalMm <= maxColH && colYs[curCol] > colTop && totalMm > colAvail) {
      nextCol();
    }

    let remMm   = totalMm;
    let startPx = 0;

    while (remMm > 0.5) {
      const avail = PAGE_H - V_MARGIN - colYs[curCol];
      if (avail <= 0.5) {
        nextCol();
        continue;
      }
      const chunkMm = Math.min(remMm, avail);
      const endPx   = Math.round(startPx + chunkMm * pxPerMm);

      pdf.addImage(
        sliceImgData(canvas, Math.round(startPx), endPx),
        "JPEG", COL_X[curCol], colYs[curCol], COL_W, chunkMm
      );

      colYs[curCol] += chunkMm;
      startPx  = endPx;
      remMm   -= chunkMm;

      if (remMm > 0.5) nextCol();
    }
  }

  // ── 섹션 렌더링 및 배치 ────────────────────────────────────────────
  // 첫 페이지 컬럼 구분선
  drawDivider();

  const sections = buildPdfSections(data, mode);

  for (const sec of sections) {
    const isFullWidth = sec.type === "header" || sec.type === "passage";
    const containerW  = isFullWidth ? FULL_W_PX : COL_W_PX;
    const canvas      = await renderToCanvas(sec.html, containerW);

    if (isFullWidth) {
      placeFullWidth(canvas);
    } else {
      placeInColumn(canvas);
    }
  }

  pdf.save(buildFilename(data, mode));
}
