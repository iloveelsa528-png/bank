import type { PatternBasedQuestion } from "@/types/pattern-remix";

export type PdfMode = "student" | "teacher" | "full";

export interface PdfData {
  title: string;
  school?: string;
  grade?: string;
  area?: string;
  passageTitle?: string;
  passageText?: string;
  passageImageUrls?: string[];
  keyPoints?: string;
  patternSetTitle?: string;
  questions: PatternBasedQuestion[];
  createdAt?: string;
}

function today() {
  return new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "-").replace(".", "");
}

export function buildFilename(data: PdfData, mode: PdfMode): string {
  const parts = [
    data.school ?? "",
    data.grade ?? "",
    data.area ?? "",
    data.title,
    today(),
    mode === "student" ? "학생용" : mode === "teacher" ? "교사용" : "전체본",
  ].filter(Boolean);
  return parts.join("_") + ".pdf";
}

function choiceRow(num: number, text: string, isCorrect: boolean, reason: string, mode: PdfMode): string {
  const mark = mode !== "student" && isCorrect ? "★" : "";
  const reasonPart = mode !== "student" ? `<span style="color:#666;font-size:11px;"> — ${reason}</span>` : "";
  return `
    <div style="display:flex;gap:8px;margin-bottom:4px;padding:4px 6px;border-radius:4px;background:${isCorrect && mode !== "student" ? "#f0fdf4" : "transparent"}">
      <span style="min-width:20px;font-weight:600;color:${isCorrect && mode !== "student" ? "#16a34a" : "#374151"}">
        ${num}. ${mark}
      </span>
      <span style="color:#1f2937">${text}${reasonPart}</span>
    </div>`;
}

function questionBlock(q: PatternBasedQuestion, mode: PdfMode): string {
  const header = `
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
      <span style="background:#ede9fe;color:#6d28d9;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600">${q.question_type}</span>
      <span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600">${q.difficulty}</span>
      ${q.answer === 0 ? `<span style="background:#f3f4f6;color:#374151;padding:2px 8px;border-radius:99px;font-size:11px">서술형</span>` : ""}
    </div>`;

  const choices = q.choices.length > 0
    ? `<div style="margin-top:8px">${q.choices.map(c => choiceRow(c.number, c.text, c.is_correct, c.reason, mode)).join("")}</div>`
    : "";

  const answerBlock = mode !== "student" && q.answer > 0
    ? `<div style="margin-top:8px;padding:8px;background:#f0fdf4;border-left:3px solid #16a34a;border-radius:4px;font-size:12px;color:#065f46">정답: ${q.answer}번</div>`
    : "";

  const descriptive = mode !== "student" && q.answer === 0 && q.descriptive_answer
    ? `<div style="margin-top:8px;padding:8px;background:#eff6ff;border-left:3px solid #3b82f6;border-radius:4px;font-size:12px;color:#1e40af"><strong>모범 답안</strong><br/><span style="white-space:pre-wrap">${q.descriptive_answer}</span></div>`
    : "";

  const explanation = mode !== "student" && q.explanation
    ? `<div style="margin-top:8px;padding:8px;background:#fefce8;border-left:3px solid #eab308;border-radius:4px;font-size:12px;color:#713f12"><strong>해설</strong><br/><span style="white-space:pre-wrap">${q.explanation}</span></div>`
    : "";

  const patternRef = mode === "full" && q.pattern_reference
    ? `<div style="margin-top:6px;font-size:11px;color:#7c3aed">패턴 참조: ${q.pattern_reference}</div>`
    : "";

  return `
    <div style="margin-bottom:20px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;page-break-inside:avoid">
      ${header}
      <p style="font-size:14px;font-weight:600;color:#111827;line-height:1.6;margin:0">
        <span style="color:#9ca3af;margin-right:6px">${q.question_number}.</span>${q.question_text}
      </p>
      ${choices}
      ${answerBlock}
      ${descriptive}
      ${explanation}
      ${patternRef}
    </div>`;
}

export function buildHtml(data: PdfData, mode: PdfMode): string {
  const modeLabel = mode === "student" ? "학생용" : mode === "teacher" ? "교사용" : "전체본";

  const imagesHtml = (data.passageImageUrls ?? []).length > 0
    ? `<div style="margin-bottom:16px">
        <p style="font-size:12px;font-weight:600;color:#6b7280;margin-bottom:8px">원본 이미지</p>
        <div style="display:flex;flex-wrap:wrap;gap:12px">
          ${(data.passageImageUrls ?? []).map(url =>
            `<img src="${url}" style="max-width:100%;max-height:400px;border:1px solid #e5e7eb;border-radius:6px;object-fit:contain" crossorigin="anonymous"/>`
          ).join("")}
        </div>
      </div>`
    : "";

  const passageSection = (data.passageText || imagesHtml) ? `
    <div style="margin-bottom:28px;padding:20px;background:#fffbeb;border:2px solid #d97706;border-radius:8px;page-break-inside:avoid">
      <h3 style="font-size:15px;font-weight:800;color:#92400e;margin:0 0 12px;border-bottom:1px solid #fcd34d;padding-bottom:8px">
        ◆ 다음 글을 읽고 물음에 답하시오.
        ${data.passageTitle ? `<span style="font-size:12px;font-weight:500;color:#b45309;margin-left:8px">(${data.passageTitle})</span>` : ""}
      </h3>
      ${imagesHtml}
      ${data.passageText ? `<p style="font-size:14px;color:#1f2937;line-height:2;white-space:pre-wrap;margin:0;word-break:keep-all">${data.passageText}</p>` : ""}
      ${mode === "full" && data.keyPoints ? `<div style="margin-top:12px;padding:10px;background:#fff;border-left:3px solid #6d28d9;border-radius:4px;font-size:12px;color:#374151"><strong>핵심 내용</strong><br/><span style="white-space:pre-wrap">${data.keyPoints}</span></div>` : ""}
    </div>` : "";

  const patternSection = mode === "full" && data.patternSetTitle ? `
    <div style="margin-bottom:16px;padding:10px 14px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;font-size:12px;color:#6d28d9">
      적용 기출 패턴 세트: <strong>${data.patternSetTitle}</strong>
    </div>` : "";

  const questionsHtml = data.questions.map(q => questionBlock(q, mode)).join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; color: #111827; background: #fff; padding: 32px; font-size: 14px; line-height: 1.6; }
  h1 { font-size: 20px; font-weight: 800; color: #111827; }
  h2 { font-size: 16px; font-weight: 700; color: #374151; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
</style>
</head>
<body>
  <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #7c3aed">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <h1>${data.title}</h1>
        <div style="margin-top:6px;display:flex;gap:12px;font-size:13px;color:#6b7280">
          ${data.school ? `<span>${data.school}</span>` : ""}
          ${data.grade ? `<span>${data.grade}</span>` : ""}
          ${data.area ? `<span>영역: ${data.area}</span>` : ""}
        </div>
      </div>
      <span style="background:#ede9fe;color:#7c3aed;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600">${modeLabel}</span>
    </div>
    <p style="margin-top:8px;font-size:12px;color:#9ca3af">생성일: ${data.createdAt ? new Date(data.createdAt).toLocaleDateString("ko-KR") : today()}</p>
  </div>

  ${passageSection}
  ${patternSection}

  <h2>문제 (${data.questions.length}문항)</h2>
  ${questionsHtml}
</body>
</html>`;
}
