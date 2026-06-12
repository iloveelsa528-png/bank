import type { PatternBasedQuestion } from "@/types/pattern-remix";

export type PdfMode = "student" | "teacher" | "full";

export interface PassagePdfInfo {
  title?: string;
  text?: string;
  imageUrls?: string[];
  keyPoints?: string;
  startQuestionIdx: number;
  questionCount: number;
}

export interface PdfData {
  title: string;
  school?: string;
  grade?: string;
  area?: string;
  patternSetTitle?: string;
  questions: PatternBasedQuestion[];
  createdAt?: string;
  // 단일 지문 (레거시)
  passageTitle?: string;
  passageText?: string;
  passageImageUrls?: string[];
  keyPoints?: string;
  // 다중 지문 (신규)
  passages?: PassagePdfInfo[];
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

  if (data.passages && data.passages.length > 0) {
    // 다중 지문 모드: [지문1] [Q1..Qn] [지문2] [Q(n+1)..] 순서
    for (const p of data.passages) {
      const passageData: PdfData = {
        ...data,
        passageTitle: p.title,
        passageText: p.text,
        passageImageUrls: p.imageUrls,
        keyPoints: p.keyPoints,
      };
      if (p.text || (p.imageUrls ?? []).length > 0) {
        sections.push({ type: "passage", html: buildPassageSection(passageData, mode) });
      }
      data.questions
        .slice(p.startQuestionIdx, p.startQuestionIdx + p.questionCount)
        .forEach((q) => sections.push({ type: "question", html: buildQuestionSection(q, mode) }));
    }
  } else {
    // 단일 지문 (레거시)
    if (data.passageText || (data.passageImageUrls ?? []).length > 0) {
      sections.push({ type: "passage", html: buildPassageSection(data, mode) });
    }
    data.questions.forEach((q) => {
      sections.push({ type: "question", html: buildQuestionSection(q, mode) });
    });
  }

  return sections;
}

// ─── 지문 구조 레이블 제거 ([가][나][대] 등) ─────────────────────────────────
function stripStructuralLabels(text: string): string {
  return text
    .replace(/^\s*\[[가나다라마바사아자차카타파하대소중]\]\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── 보기/보조제시문/인용문 박스 파싱 (다중 박스 지원) ───────────────────────
type BoxItem = { boxLabel: string; boxContent: string };
type ParsedBoxResult = { prompt: string; boxes: BoxItem[] };

function parseRefBox(text: string): ParsedBoxResult | null {
  // 독립형 헤더 판정: 직전 문자가 문장 끝(.!?:), 줄바꿈, 또는 텍스트 시작
  function isStandalone(idx: number): boolean {
    const before = text.substring(0, idx).trimEnd();
    const ch = before[before.length - 1] ?? '';
    return !ch || /[.!?:\n]/.test(ch);
  }

  type RawMarker = { idx: number; endIdx: number; label: string; content?: string };
  const markers: RawMarker[] = [];

  // ── 라벨 패턴 목록 ───────────────────────────────────────────────────────
  const patterns: { re: RegExp; label: string }[] = [
    { re: /\[보조\s*제시문\]|<보조\s*제시문>/g, label: '<보조 제시문>' },
    { re: /\[보기\]|<보\s*기>/g,               label: '<보기>'         },
    { re: /\[조건\]|<조건>/g,                  label: '<조건>'         },
    { re: /\[참고\]|<참고>/g,                  label: '<참고>'         },
    { re: /\[자료\]|<자료>/g,                  label: '<자료>'         },
    { re: /\[요약\]/g,                         label: '<요약>'         },
    { re: /\[지문\]/g,                         label: '<지문>'         },
    { re: /\[가\]/g,                           label: '(가)'           },
    { re: /\[나\]/g,                           label: '(나)'           },
    { re: /\[다\]/g,                           label: '(다)'           },
    { re: /\[라\]/g,                           label: '(라)'           },
  ];

  for (const { re, label } of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (isStandalone(m.index)) {
        markers.push({ idx: m.index, endIdx: m.index + m[0].length, label });
      }
    }
  }

  // ── 큰따옴표 인용문 (20자 이상, 독립형) ──────────────────────────────────
  const quoteRe = /"([^"]{20,})"/g;
  let qm: RegExpExecArray | null;
  while ((qm = quoteRe.exec(text)) !== null) {
    if (isStandalone(qm.index)) {
      // content 는 따옴표 안쪽 텍스트, label 없음 (헤더 미표시)
      markers.push({
        idx: qm.index,
        endIdx: qm.index + qm[0].length,
        label: '',
        content: qm[1].trim(),
      });
    }
  }

  if (markers.length === 0) return null;

  // 위치 순 정렬 후 겹치는 마커 제거
  markers.sort((a, b) => a.idx - b.idx);
  const deduped = markers.filter((m, i) =>
    i === 0 || m.idx >= markers[i - 1].endIdx
  );

  const prompt = text.substring(0, deduped[0].idx).trimEnd();

  const boxes: BoxItem[] = deduped.map((m, i) => {
    if (m.content !== undefined) {
      // 큰따옴표: content 이미 결정됨
      return { boxLabel: m.label, boxContent: m.content };
    }
    const start = m.endIdx;
    const end   = i + 1 < deduped.length ? deduped[i + 1].idx : text.length;
    return { boxLabel: m.label, boxContent: text.substring(start, end).trim() };
  }).filter(b => b.boxContent.length >= 10);

  if (boxes.length === 0) return null;
  return { prompt, boxes };
}

// ─── 통합 HTML (수능/모의고사 형식 2단 레이아웃) ─────────────────────────────
export function buildUnifiedHtml(data: PdfData, mode: PdfMode): string {
  const showAnswerInfo = mode !== "student";
  const modeLabel = mode === "student" ? "학생용" : mode === "teacher" ? "교사용" : "전체본";
  const date = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    : today();
  const school = data.school ?? "";
  const grade  = data.grade  ?? "";
  const area   = data.area   ? `${data.area} 영역` : "국어 영역";

  // ── 발문/선택지 내 참조 표기 정규화 + OCR 구조 레이블 제거 ──────────────
  function normalizeRefs(t: string): string {
    return t
      .replace(/\[보기\]/g, '<보기>')
      .replace(/\[보조\s*제시문\]/g, '<보조 제시문>')
      .replace(/\[조건\]/g, '<조건>')
      .replace(/\[참고\]/g, '<참고>')
      // 인라인 [가]/[나]/[다]/[라] → (가)/(나)/(다)/(라) 변환 (박스 헤더와 통일)
      .replace(/\[([가나다라])\]/g, '($1)')
      // [대][소][중] 같은 OCR 구조 레이블 제거 (단독 또는 앞뒤 공백 포함)
      .replace(/\s*\[[대소중]\]\s*/g, ' ')
      .replace(/ {2,}/g, ' ')
      .trim();
  }

  // ── 문항 1개 HTML ─────────────────────────────────────────────────────────
  function qHtml(q: PatternBasedQuestion): string {
    const choices = q.choices.length > 0
      ? `<div style="margin-top:6px;">` +
        q.choices.map((c, ci) => {
          const hl     = showAnswerInfo && c.is_correct;
          const circle = CIRCLE[ci] ?? `${c.number}.`;
          // 선택지 두 번째 줄이 텍스트 시작 위치에 맞게 들여쓰기 (hanging indent)
          const reason = showAnswerInfo && c.reason
            ? `<p style="font-size:8pt;color:#555;padding-left:1.3em;line-height:1.35;margin-top:1px;">${escapeHtml(c.reason)}</p>`
            : "";
          return `<p style="font-size:9.5pt;line-height:1.72;margin:2px 0;word-break:keep-all;` +
            `padding-left:1.25em;text-indent:-1.25em;${hl ? "font-weight:700;" : ""}">` +
            `<span style="font-weight:700;color:${hl ? "#0a5c0a" : "#000"};">${circle}</span>` +
            `<span style="${hl ? "color:#0a5c0a;" : ""}"> ${escapeHtml(normalizeRefs(c.text))}${hl ? " ★" : ""}</span>` +
            `</p>${reason}`;
        }).join("") +
        `</div>`
      : "";

    const extra = showAnswerInfo ? [
      q.answer > 0
        ? `<p style="margin-top:6px;font-size:9pt;font-weight:700;color:#0a5c0a;border-top:1px dashed #ccc;padding-top:4px;">▶ 정답: ${q.answer}번</p>`
        : "",
      q.answer === 0 && q.descriptive_answer
        ? `<p style="margin-top:6px;font-size:9pt;color:#1e40af;white-space:pre-wrap;border-top:1px dashed #ccc;padding-top:4px;"><b>모범답안</b><br/>${escapeHtml(q.descriptive_answer)}</p>`
        : "",
      q.explanation
        ? `<p style="margin-top:4px;font-size:8.5pt;color:#7c5b00;white-space:pre-wrap;line-height:1.55;"><b>해설</b>&nbsp;${escapeHtml(q.explanation)}</p>`
        : "",
      mode === "full" && q.pattern_reference
        ? `<p style="font-size:8pt;color:#7c3aed;margin-top:3px;">패턴:&nbsp;${escapeHtml(q.pattern_reference)}</p>`
        : "",
    ].join("") : "";

    // 학생용: 고난도 [3점] 표시 / 교사용: 유형·난이도 태그
    const pointTag = !showAnswerInfo && q.difficulty === '고난도'
      ? `&thinsp;<span style="font-size:8pt;font-weight:400;">[3점]</span>` : "";
    const infoTag = showAnswerInfo
      ? `&nbsp;<span style="font-size:8.5pt;color:#777;font-weight:400;">[${q.question_type}·${q.difficulty}${q.answer === 0 ? "·서술형" : ""}]</span>`
      : "";

    // 박스 파싱 — [보기]/[조건]/[가][나]/인용문 등을 테두리 박스로 분리
    const boxParsed = parseRefBox(q.question_text);
    const boxesHtml = boxParsed
      ? boxParsed.boxes.map(b => {
          const headerHtml = b.boxLabel
            ? `<p style="font-size:9.5pt;font-weight:700;text-align:center;
                  margin-bottom:5px;padding-bottom:3px;border-bottom:1px solid #aaa;">${escapeHtml(b.boxLabel)}</p>`
            : "";
          return `<div style="margin:6px 0 8px;border:1.5px solid #333;padding:6px 12px 8px;break-inside:avoid;">
            ${headerHtml}
            <p style="font-size:9.5pt;line-height:1.85;white-space:pre-wrap;word-break:keep-all;">${escapeHtml(b.boxContent)}</p>
          </div>`;
        }).join("")
      : "";
    const questionBodyHtml = boxParsed
      ? `<p style="font-size:10.5pt;font-weight:700;line-height:1.75;word-break:keep-all;">
           ${q.question_number}.&nbsp;${escapeHtml(normalizeRefs(boxParsed.prompt))}${pointTag}${infoTag}
         </p>${boxesHtml}`
      : `<p style="font-size:10.5pt;font-weight:700;line-height:1.75;word-break:keep-all;">
           ${q.question_number}.&nbsp;${escapeHtml(normalizeRefs(q.question_text))}${pointTag}${infoTag}
         </p>`;

    return `<div style="margin-bottom:0;padding-top:9px;border-top:1px solid #ddd;">
      ${questionBodyHtml}
      ${choices}
      ${extra}
    </div>`;
  }

  // ── 지문 그룹 ─────────────────────────────────────────────────────────────
  type G = {
    title?: string; text?: string; imageUrls?: string[];
    keyPoints?: string; questions: PatternBasedQuestion[];
  };
  const groups: G[] = data.passages && data.passages.length > 0
    ? data.passages.map(p => ({
        title: p.title, text: p.text, imageUrls: p.imageUrls, keyPoints: p.keyPoints,
        questions: data.questions.slice(p.startQuestionIdx, p.startQuestionIdx + p.questionCount),
      }))
    : [{
        title: data.passageTitle, text: data.passageText,
        imageUrls: data.passageImageUrls, keyPoints: data.keyPoints,
        questions: data.questions,
      }];

  // ── 그룹별 HTML ───────────────────────────────────────────────────────────
  const contentHtml = groups.map((g, gi) => {
    const sepHtml = gi > 0
      ? `<div style="column-span:all;border-top:2px solid #555;margin:16px 0 10px;"></div>`
      : "";
    const hasPass = !!(g.text || (g.imageUrls ?? []).length > 0);
    const qNums  = g.questions.map(q => q.question_number).sort((a, b) => a - b);
    const range  = qNums.length > 1
      ? `[${qNums[0]} ~ ${qNums[qNums.length - 1]}]`
      : qNums.length === 1 ? `[${qNums[0]}]` : "";

    // 지시문 (수능 형식: 굵게, 문제 번호 범위만 — 제목은 지문 박스 안에서 처리)
    const directive = hasPass
      ? `<p style="font-size:10pt;font-weight:700;line-height:1.7;margin-bottom:6px;break-after:avoid;">${range}&nbsp;다음 글을 읽고 물음에 답하시오.</p>`
      : "";

    // 지문 이미지
    const imgs = (g.imageUrls ?? []).length > 0
      ? `<div style="margin-bottom:6px;">${(g.imageUrls ?? []).map(url =>
          `<img src="${url}" crossorigin="anonymous" style="max-width:100%;max-height:260px;display:block;margin-bottom:4px;object-fit:contain;"/>`
        ).join("")}</div>`
      : "";

    // 핵심 포인트 (전체본)
    const kp = mode === "full" && g.keyPoints
      ? `<p style="margin-top:6px;font-size:8.5pt;color:#555;border-top:1px dashed #bbb;padding-top:4px;"><b style="color:#7c3aed;">핵심</b>&nbsp;${escapeHtml(g.keyPoints)}</p>`
      : "";

    // 지문 — 수능 스타일: 얇은 단색 테두리, 내부 여백 / 구조 레이블([가][대] 등) 제거
    const cleanPassText = g.text ? stripStructuralLabels(g.text) : '';
    // escape 먼저, 그 다음 (가)(나) 마커를 굵게 강조 (HTML 안전)
    const styledPassHtml = escapeHtml(cleanPassText)
      .replace(/\(([가나다라마바사아자차카타파하])\)/g,
        '<b style="font-size:10.5pt;letter-spacing:0.5px;">($1)</b>');
    const passBox = hasPass
      ? `<div style="border:1px solid #555;margin-bottom:10px;padding:9px 13px 11px;">
           ${imgs}
           ${styledPassHtml ? `<p style="font-size:10pt;line-height:1.95;white-space:pre-wrap;word-break:keep-all;">${styledPassHtml}</p>` : ""}
           ${kp}
         </div>`
      : "";

    // 문제 묶음 — 각 문항 사이 얇은 선, break-inside:avoid 로 단 중간 분리 방지
    const questionsHtml = g.questions
      .map(q => `<div style="break-inside:avoid;">${qHtml(q)}</div>`)
      .join("");

    return `${sepHtml}${directive}${passBox}${questionsHtml}<div style="height:8px;"></div>`;
  }).join("");

  // ── 단일 2단 컬럼 래퍼 — column-fill:auto 로 좌→우→다음 페이지 순 채움 ──────
  const columnsHtml = `<div style="column-count:2;column-gap:22px;column-rule:1px solid #999;column-fill:auto;orphans:2;widows:2;">
    ${contentHtml}
  </div>`;

  // ── 정답표 (교사용·전체본) ─────────────────────────────────────────────────
  const answerTable = showAnswerInfo ? (() => {
    const objQs = data.questions.filter(q => q.answer > 0);
    if (objQs.length === 0) return "";
    const cells = objQs.map(q =>
      `<td style="border:1px solid #bbb;padding:3px 8px;text-align:center;font-size:9pt;">
        <span style="font-size:8pt;color:#555;">${q.question_number}번</span><br/><b style="font-size:10pt;">${q.answer}</b>
      </td>`
    ).join("");
    return `<div style="margin-top:16px;padding-top:8px;border-top:2px solid #555;">
      <p style="font-size:10pt;font-weight:700;margin-bottom:6px;">■ 정답</p>
      <table style="border-collapse:collapse;"><tr>${cells}</tr></table>
    </div>`;
  })() : "";

  // ── 상단 정보 행 (각 파트를 개별 escape 후 HTML 엔티티로 join) ────────────
  const topInfoHtml = [school, grade, date]
    .filter(Boolean)
    .map(s => escapeHtml(s))
    .join("&nbsp;&nbsp;&nbsp;");

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body,table,td,p,span,div,b,strong{
        font-family:'Apple SD Gothic Neo','Malgun Gothic','맑은 고딕','Noto Sans KR',
          'Source Han Sans KR','NanumGothic',sans-serif;
      }
      body{
        font-size:10pt;color:#000;background:#fff;line-height:1.75;
        word-break:keep-all;overflow-wrap:break-word;
        -webkit-print-color-adjust:exact;print-color-adjust:exact;
      }
      p{margin:0;padding:0;}
    </style>
    </head><body>
    <div style="padding:9mm 14mm 13mm;">

      <!-- 상단 정보 (학교·학년·날짜) -->
      <p style="font-size:8.5pt;color:#444;text-align:center;margin-bottom:4px;letter-spacing:0.3px;">
        ${topInfoHtml}
      </p>

      <!-- 대제목 행 -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:3px;">
        <tr style="vertical-align:bottom;">
          <td style="font-size:22pt;font-weight:900;letter-spacing:-0.5px;line-height:1.1;">
            ${escapeHtml(area)}
          </td>
          <td style="text-align:right;font-size:9pt;color:#333;padding-bottom:3px;">
            <b style="font-size:10pt;">${escapeHtml(modeLabel)}</b>
          </td>
        </tr>
      </table>

      <!-- 이중 구분선 (수능 스타일) -->
      <div style="border-top:3.5px solid #000;margin-bottom:2px;"></div>
      <div style="border-top:1px solid #000;margin-bottom:12px;"></div>

      ${columnsHtml}
      ${answerTable}

    </div>
    </body></html>`;
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
