import { buildFilename, type PdfData, type PdfMode } from "./generate";

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

// ─── PDF 다운로드 (서버 API → Playwright page.pdf) ────────────────────────────
export async function downloadPdf(data: PdfData, mode: PdfMode) {
  const filename = buildFilename(data, mode);

  const res = await fetch("/api/pdf/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, mode }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`PDF 생성 실패: ${msg}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
