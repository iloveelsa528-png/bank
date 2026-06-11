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

export interface PdfSection {
  type: "header" | "passage" | "question";
  html: string;
}

const CIRCLE = ["①", "②", "③", "④", "⑤"];

function escapeHtml(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function today() {
  return new Date()
    .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\. /g, "-")
    .replace(".", "");
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

// 전체 폭 섹션용 CSS (헤더, 지문)
const FULL_CSS = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{
    font-family:'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic','맑은 고딕',sans-serif;
    color:#111827;background:#fff;font-size:14px;line-height:1.75;
    word-break:keep-all;-webkit-print-color-adjust:exact;print-color-adjust:exact;
  }
`;

// 2단 컬럼용 CSS (문제) — 동일한 물리 폰트 크기, 패딩만 줄임
const COL_CSS = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{
    font-family:'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic','맑은 고딕',sans-serif;
    color:#111827;background:#fff;font-size:14px;line-height:1.65;
    word-break:keep-all;-webkit-print-color-adjust:exact;print-color-adjust:exact;
  }
`;

function fullDoc(body: string): string {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/>
  <style>${FULL_CSS}</style></head><body>${body}</body></html>`;
}

function colDoc(body: string): string {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/>
  <style>${COL_CSS}</style></head><body>${body}</body></html>`;
}

// ─── 1. 헤더 섹션 (전체 폭) ──────────────────────────────────────────────────
export function buildHeaderSection(data: PdfData, mode: PdfMode): string {
  const modeLabel = mode === "student" ? "학생용" : mode === "teacher" ? "교사용" : "전체본";
  const modeBg = mode === "student" ? "#1e3a8a" : mode === "teacher" ? "#4c1d95" : "#134e4a";
  const date = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString("ko-KR")
    : today();

  const meta = [data.school, data.grade, data.area ? `${data.area} 영역` : ""]
    .filter(Boolean)
    .join("  |  ");

  return fullDoc(`
    <div style="padding:20px 32px 0">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <h1 style="font-size:18px;font-weight:800;color:#111827;line-height:1.4;flex:1">
          ${escapeHtml(data.title)}
        </h1>
        <span style="background:${modeBg};color:#fff;padding:4px 14px;border-radius:4px;
          font-size:11px;font-weight:700;white-space:nowrap;flex-shrink:0;margin-top:3px">
          ${modeLabel}
        </span>
      </div>
      <div style="margin-top:5px;font-size:11px;color:#6b7280;display:flex;justify-content:space-between">
        <span>${escapeHtml(meta)}</span>
        <span>생성일: ${date}</span>
      </div>
      <div style="margin-top:10px;border-bottom:2px solid #111827"></div>
    </div>
  `);
}

// ─── 2. 지문 섹션 (전체 폭) ──────────────────────────────────────────────────
export function buildPassageSection(data: PdfData, mode: PdfMode): string {
  const imagesHtml =
    (data.passageImageUrls ?? []).length > 0
      ? `<div style="margin-bottom:12px;">
          ${(data.passageImageUrls ?? [])
            .map(
              (url) =>
                `<img src="${url}" crossorigin="anonymous"
                  style="max-width:100%;max-height:360px;display:block;margin-bottom:6px;
                         border:1px solid #d1d5db;object-fit:contain;"/>`
            )
            .join("")}
        </div>`
      : "";

  const keyPointsHtml =
    mode === "full" && data.keyPoints
      ? `<div style="margin-top:12px;padding:8px 12px;border-top:1px dashed #d1d5db;
            font-size:12px;color:#374151;">
          <strong style="color:#6d28d9;">핵심 포인트: </strong>${escapeHtml(data.keyPoints)}
        </div>`
      : "";

  return fullDoc(`
    <div style="padding:12px 32px 0">
      <div style="border:2px solid #1e3a8a;border-radius:4px;overflow:visible;">
        <div style="background:#1e3a8a;padding:8px 18px;display:flex;align-items:center;gap:10px;border-radius:3px 3px 0 0;">
          <span style="font-size:13px;font-weight:700;color:#fff;">
            ◆ 다음 글을 읽고 물음에 답하시오.
          </span>
          ${data.passageTitle
            ? `<span style="font-size:11px;color:#93c5fd;">[${escapeHtml(data.passageTitle)}]</span>`
            : ""}
        </div>
        <div style="padding:14px 22px;">
          ${imagesHtml}
          ${data.passageText
            ? `<p style="font-size:13px;color:#111827;line-height:1.85;
                white-space:pre-wrap;word-break:keep-all;">${escapeHtml(data.passageText)}</p>`
            : ""}
          ${keyPointsHtml}
        </div>
      </div>
    </div>
  `);
}

// ─── 3. 문제 섹션 (컬럼 폭) ──────────────────────────────────────────────────
export function buildQuestionSection(q: PatternBasedQuestion, mode: PdfMode): string {
  const showAnswerInfo = mode !== "student";

  const choicesHtml =
    q.choices.length > 0
      ? `<div style="margin-top:10px;display:flex;flex-direction:column;gap:4px;">
          ${q.choices
            .map((c, ci) => {
              const highlight = showAnswerInfo && c.is_correct;
              const circle = CIRCLE[ci] ?? `${c.number}.`;
              const mark = mode !== "student" && highlight ? " ★" : "";
              const reasonHtml =
                showAnswerInfo && c.reason
                  ? `<div style="font-size:10px;color:#6b7280;margin-top:2px;padding-left:18px;line-height:1.5;">${escapeHtml(c.reason)}</div>`
                  : "";
              return `
              <div style="padding:5px 10px;border-radius:3px;
                border:1px solid ${highlight ? "#16a34a" : "#e2e8f0"};
                background:${highlight ? "#f0fdf4" : "#fff"};">
                <div style="display:flex;gap:6px;align-items:flex-start;">
                  <span style="font-weight:700;color:${highlight ? "#16a34a" : "#111827"};
                    flex-shrink:0;font-size:13px;">${circle}${mark}</span>
                  <span style="color:${highlight ? "#166534" : "#111827"};flex:1;font-size:13px;line-height:1.6;">${escapeHtml(c.text)}</span>
                </div>
                ${reasonHtml}
              </div>`;
            })
            .join("")}
        </div>`
      : "";

  const answerHtml =
    showAnswerInfo && q.answer > 0
      ? `<div style="margin-top:8px;padding:6px 12px;background:#f0fdf4;
            border-left:3px solid #16a34a;font-size:12px;color:#166534;font-weight:700;">
          정답: ${q.answer}번
        </div>`
      : "";

  const descriptiveHtml =
    showAnswerInfo && q.answer === 0 && q.descriptive_answer
      ? `<div style="margin-top:8px;padding:10px;background:#eff6ff;
            border-left:3px solid #3b82f6;font-size:12px;color:#1e40af;">
          <strong>모범 답안</strong><br/>
          <span style="white-space:pre-wrap;">${escapeHtml(q.descriptive_answer)}</span>
        </div>`
      : "";

  const explanationHtml =
    showAnswerInfo && q.explanation
      ? `<div style="margin-top:8px;padding:10px;background:#fefce8;
            border-left:3px solid #eab308;font-size:11px;color:#713f12;">
          <strong>해설</strong><br/>
          <span style="white-space:pre-wrap;">${escapeHtml(q.explanation)}</span>
        </div>`
      : "";

  const infoTag =
    showAnswerInfo
      ? `<span style="font-size:10px;color:#9ca3af;font-weight:400;margin-left:5px;">
          [${q.question_type} · ${q.difficulty}${q.answer === 0 ? " · 서술형" : ""}]
        </span>`
      : "";

  const patternRef =
    mode === "full" && q.pattern_reference
      ? `<div style="font-size:10px;color:#7c3aed;margin-top:3px;">
          패턴: ${escapeHtml(q.pattern_reference)}
        </div>`
      : "";

  return colDoc(`
    <div style="padding:5px 8px 0;">
      <div style="padding:10px 12px;border:1px solid #d1d5db;border-radius:4px;">
        <div style="display:flex;gap:8px;align-items:flex-start;">
          <span style="font-size:15px;font-weight:800;color:#111827;flex-shrink:0;">
            ${q.question_number}.
          </span>
          <div style="flex:1;">
            <p style="font-size:13px;font-weight:600;color:#111827;line-height:1.7;word-break:keep-all;">
              ${escapeHtml(q.question_text)}${infoTag}
            </p>
            ${patternRef}
          </div>
        </div>
        ${choicesHtml}
        ${answerHtml}
        ${descriptiveHtml}
        ${explanationHtml}
      </div>
    </div>
  `);
}

// ─── 섹션 배열 빌드 ───────────────────────────────────────────────────────────
export function buildPdfSections(data: PdfData, mode: PdfMode): PdfSection[] {
  const sections: PdfSection[] = [];
  sections.push({ type: "header", html: buildHeaderSection(data, mode) });
  if (data.passageText || (data.passageImageUrls ?? []).length > 0) {
    sections.push({ type: "passage", html: buildPassageSection(data, mode) });
  }
  data.questions.forEach((q) => {
    sections.push({ type: "question", html: buildQuestionSection(q, mode) });
  });
  return sections;
}

// ─── 레거시: TXT 등에서 사용 ─────────────────────────────────────────────────
export function buildHtml(data: PdfData, mode: PdfMode): string {
  const sections = buildPdfSections(data, mode);
  const bodies = sections.map((s) => {
    const m = s.html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return m ? m[1] : s.html;
  });
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/>
  <style>${FULL_CSS}body{padding:0;}</style></head>
  <body>${bodies.join("")}</body></html>`;
}
