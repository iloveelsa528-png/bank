import { buildHtml, buildFilename, type PdfData, type PdfMode } from "./generate";

export function downloadTxt(data: PdfData) {
  const lines: string[] = [];
  lines.push(`=== ${data.title} ===`);
  const meta = [data.school, data.grade, data.area].filter(Boolean).join(' ');
  if (meta) lines.push(meta);
  lines.push('');

  if (data.passageText) {
    lines.push('[ 지문 ]');
    if (data.passageTitle) lines.push(`제목: ${data.passageTitle}`);
    lines.push('');
    lines.push(data.passageText);
    lines.push('');
  }

  lines.push('[ 문제 ]');
  lines.push('');
  for (const q of data.questions) {
    lines.push(`${q.question_number}. [${q.question_type}·${q.difficulty}] ${q.question_text}`);
    for (const c of q.choices) {
      const mark = c.is_correct ? '★' : ' ';
      lines.push(`  ${mark}${c.number}) ${c.text}`);
    }
    if (q.answer === 0) lines.push('  (서술형)');
    lines.push('');
  }

  const objQuestions = data.questions.filter(q => q.answer > 0);
  if (objQuestions.length > 0) {
    lines.push('[ 정답 ]');
    lines.push(objQuestions.map(q => `${q.question_number}번: ${q.answer}`).join('  '));
    lines.push('');
  }

  lines.push('[ 해설 ]');
  lines.push('');
  for (const q of data.questions) {
    lines.push(`${q.question_number}번 (${q.question_type})`);
    if (q.answer > 0) lines.push(`정답: ${q.answer}번`);
    if (q.explanation) lines.push(`해설: ${q.explanation}`);
    if (q.answer === 0 && q.descriptive_answer) lines.push(`모범답안: ${q.descriptive_answer}`);
    lines.push('');
  }

  const filename = buildFilename(data, 'teacher').replace('.pdf', '.txt');
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadPdf(data: PdfData, mode: PdfMode) {
  const { jsPDF } = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");

  const html = buildHtml(data, mode);

  const container = document.createElement("div");
  container.style.cssText = "position:absolute;left:-9999px;top:0;width:794px;background:#fff;z-index:9999;visibility:visible";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: 794,
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let y = 0;
    while (y < imgH) {
      if (y > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, -y, imgW, imgH);
      y += pageH;
    }

    pdf.save(buildFilename(data, mode));
  } finally {
    document.body.removeChild(container);
  }
}
