import type { PatternBasedQuestion } from "@/types/pattern-remix";
import type { ImageSlot } from "@/types/passages";
import { CIRCLE, isChoicesDuplicated } from "@/lib/choices";

export type PdfMode = "student" | "teacher" | "full";

export interface PassagePdfInfo {
  title?: string;
  text?: string;
  imageUrls?: (string | ImageSlot)[];
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
  passageImageUrls?: (string | ImageSlot)[];
  keyPoints?: string;
  // 다중 지문 (신규)
  passages?: PassagePdfInfo[];
}

export interface PdfSection {
  type: "header" | "passage" | "question";
  html: string;
}

function escapeHtml(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// string(구 형식) 또는 ImageSlot(신 형식) 모두 URL 문자열로 정규화
function toImageUrl(item: string | ImageSlot): string {
  return typeof item === "string" ? item : item.url;
}

// ─── Image slot helpers ───────────────────────────────────────────────────

// ImageSlot 배열 → id(대문자) → url 맵
function buildSlotMap(slots: (string | ImageSlot)[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of slots) {
    if (typeof item !== "string") map.set(item.id.toUpperCase(), item.url);
  }
  return map;
}

// 이미 escapeHtml을 거친 HTML 문자열 안의 [그림A] 토큰을 img 또는 placeholder로 교체.
// [ ] 는 HTML 특수문자가 아니므로 escapeHtml 후에도 토큰이 원형 그대로 남아있음.
function applyImageSlotsToHtml(html: string, slotMap: Map<string, string>): string {
  if (slotMap.size === 0 && !/\[그림[A-Za-z]\]/.test(html)) return html;
  return html.replace(/\[그림([A-Za-z])\]/g, (_, letter) => {
    const url = slotMap.get(letter.toUpperCase());
    if (url) {
      return `<img src="${url}" crossorigin="anonymous"
        style="display:block;max-width:100%;max-height:240px;margin:6px auto;object-fit:contain;"/>`;
    }
    // 이미지 미연결 — 회색 placeholder 박스
    return `<span style="display:inline-block;min-width:100px;padding:10px 16px;
      background:#f3f4f6;border:1.5px dashed #9ca3af;border-radius:2px;
      font-size:9pt;color:#6b7280;vertical-align:middle;">[그림${letter}]</span>`;
  });
}

// 외부에서 호출 가능한 공개 API (테스트·향후 EditorPanel 미리보기 등에 사용)
// raw 텍스트를 받아 슬롯을 HTML로 치환한 결과를 반환 (escapeHtml은 내부에서 처리하지 않음)
export function replaceImageSlots(
  rawText: string,
  slots: (string | ImageSlot)[],
): string {
  const slotMap = buildSlotMap(slots);
  return applyImageSlotsToHtml(rawText, slotMap);
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
              (item) =>
                `<img src="${toImageUrl(item)}" crossorigin="anonymous"
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
    return !ch || /[.!?:\n)\]]/.test(ch);
  }

  // 줄 끝 판정: 닫는 ] 직후가 공백만 있고 줄바꿈 또는 텍스트 끝
  // — [가]/[나] 발문 인라인 사용("([가]와 [나]의 화자는?")과 박스 헤더 구분용
  function isLineEnd(endIdx: number): boolean {
    return /^[ \t]*(\n|$)/.test(text.substring(endIdx));
  }

  type RawMarker = { idx: number; endIdx: number; label: string; content?: string };
  const markers: RawMarker[] = [];

  // ── 라벨 패턴 목록 (isStandalone 만으로 충분한 명확한 라벨) ─────────────────
  const patterns: { re: RegExp; label: string }[] = [
    { re: /\[보조\s*제시문\]|<보조\s*제시문>/g, label: '<보조 제시문>' },
    { re: /\[보기\]|<보\s*기>/g,               label: '<보기>'         },
    { re: /\[조건\]|<조건>/g,                  label: '<조건>'         },
    { re: /\[참고\]|<참고>/g,                  label: '<참고>'         },
    { re: /\[자료\]|<자료>/g,                  label: '<자료>'         },
    { re: /\[요약\]/g,                         label: '<요약>'         },
    { re: /\[지문\]/g,                         label: '<지문>'         },
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

  // ── [가]/[나]/[다]/[라] — 발문 문장 안 인라인 사용과 구분: 줄 끝에 홀로 있을 때만 박스 ──
  const gaRe = /\[([가나다라])\]/g;
  gaRe.lastIndex = 0;
  let gam: RegExpExecArray | null;
  while ((gam = gaRe.exec(text)) !== null) {
    const endIdx = gam.index + gam[0].length;
    if (isStandalone(gam.index) && isLineEnd(endIdx)) {
      markers.push({ idx: gam.index, endIdx, label: `(${gam[1]})` });
    }
  }

  // ── [자료N] / [자료 N] — 숫자 붙은 자료 라벨, 번호를 헤더에 표시 ──────────────
  const numberedZaryoRe = /\[자료\s*(\d+)\]/g;
  numberedZaryoRe.lastIndex = 0;
  let nzm: RegExpExecArray | null;
  while ((nzm = numberedZaryoRe.exec(text)) !== null) {
    const endIdx = nzm.index + nzm[0].length;
    if (isStandalone(nzm.index) && isLineEnd(endIdx)) {
      markers.push({ idx: nzm.index, endIdx, label: `<자료${nzm[1]}>` });
    }
  }

  // ── [A] / [B] 등 영문 1~2글자 대화 구간 ─────────────────────────────────────
  // [그림A] 이미지 슬롯은 "[그림A]" 전체이므로 "[A]" 패턴과 충돌 없음
  // isLineEnd 필수: 발문 안 인라인 "[A]와 [B]를..." 오인 방지
  const latinLabelRe = /\[([A-Z]{1,2})\]/g;
  latinLabelRe.lastIndex = 0;
  let llm: RegExpExecArray | null;
  while ((llm = latinLabelRe.exec(text)) !== null) {
    const endIdx = llm.index + llm[0].length;
    if (isStandalone(llm.index) && isLineEnd(endIdx)) {
      markers.push({ idx: llm.index, endIdx, label: `[${llm[1]}]` });
    }
  }

  // ── 범용 한글 대괄호 라벨 (4~25자, 독립형) ────────────────────────────────
  // [그림A] 등 이미지 슬롯: Latin 문자 포함 → char class 불일치로 자동 제외
  // [보기]/[자료] 등 기존 라벨: 2자라서 {3,24} 불만족 → 자동 제외 (중복 없음)
  const genericLabelRe = /\[[가-힣][가-힣\s·\/\(\)\-]{3,24}\]/g;
  genericLabelRe.lastIndex = 0;
  let glm: RegExpExecArray | null;
  while ((glm = genericLabelRe.exec(text)) !== null) {
    if (isStandalone(glm.index)) {
      const inner = glm[0].slice(1, -1); // 대괄호 안 텍스트 → 박스 헤더로 사용
      markers.push({ idx: glm.index, endIdx: glm.index + glm[0].length, label: inner });
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
    // 중복 탐지: q.question_text에 choices 본문이 이미 전부 포함된 경우
    // (자료/보기 박스 안에 ①~⑤ 항목이 저장됐고 choices에도 동일 텍스트가 중복 저장된 유형)
    // Q10처럼 기호 1글자뿐인 choices는 length>=10 필터로 제외해 이 분기에 걸리지 않음
    const choicesAreDuplicated = isChoicesDuplicated(q.question_text, q.choices);

    const choices = q.choices.length > 0
      ? `<div style="margin-top:6px;">` +
        q.choices.map((c, ci) => {
          const hl           = showAnswerInfo && c.is_correct;
          const circlePrefix = CIRCLE[ci] ?? `${c.number}.`;

          if (choicesAreDuplicated) {
            // 기호만 렌더링 — 발문/자료 박스에 이미 본문이 나왔으므로 텍스트 중복 방지
            // 교사용: ★ 하이라이트 유지
            const reason = showAnswerInfo && c.reason
              ? `<p style="font-size:8pt;color:#555;padding-left:1.3em;line-height:1.35;margin-top:1px;">${escapeHtml(c.reason)}</p>`
              : "";
            return `<p style="font-size:9.5pt;line-height:1.72;margin:2px 0;">` +
              `<span style="font-weight:700;color:${hl ? "#0a5c0a" : "#000"};">${circlePrefix}</span>` +
              `${hl ? `<span style="color:#0a5c0a;font-weight:700;"> ★</span>` : ""}` +
              `</p>${reason}`;
          }

          // 일반 문항 — 기존 렌더링 그대로
          // c.text가 동그라미 기호로 시작하면 접두사 기호를 제거해 이중 출력 방지
          // 예: c.text="①" or "① 발표 중간에…" → circle="" + text 그대로
          const CIRC_RE = /^[①②③④⑤⑥⑦⑧⑨⑩]/;
          const textStartsWithCircle = CIRC_RE.test(c.text.trimStart());
          const circle   = textStartsWithCircle ? "" : circlePrefix;
          const bodyText = textStartsWithCircle ? c.text.trimStart() : c.text;
          // 선택지 두 번째 줄이 텍스트 시작 위치에 맞게 들여쓰기 (hanging indent)
          const reason = showAnswerInfo && c.reason
            ? `<p style="font-size:8pt;color:#555;padding-left:1.3em;line-height:1.35;margin-top:1px;">${escapeHtml(c.reason)}</p>`
            : "";
          return `<p style="font-size:9.5pt;line-height:1.72;margin:2px 0;word-break:keep-all;` +
            `padding-left:1.25em;text-indent:-1.25em;${hl ? "font-weight:700;" : ""}">` +
            `<span style="font-weight:700;color:${hl ? "#0a5c0a" : "#000"};">${circle}</span>` +
            `<span style="${hl ? "color:#0a5c0a;" : ""}"> ${escapeHtml(normalizeRefs(bodyText))}${hl ? " ★" : ""}</span>` +
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
    const pointTag = !showAnswerInfo && q.difficulty === '고난도' && !q.question_text.includes('[3점]')
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
    title?: string; text?: string; imageUrls?: (string | ImageSlot)[];
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
    const hasPass = !!(g.text || (g.imageUrls ?? []).length > 0);
    const qNums  = g.questions.map(q => q.question_number).sort((a, b) => a - b);
    const range  = qNums.length > 1
      ? `[${qNums[0]} ~ ${qNums[qNums.length - 1]}]`
      : qNums.length === 1 ? `[${qNums[0]}]` : "";

    // 지시문 (수능 형식: 굵게, 문제 번호 범위만 — 제목은 지문 박스 안에서 처리)
    const directive = hasPass
      ? `<p style="font-size:10pt;font-weight:700;line-height:1.7;margin-bottom:6px;break-after:avoid;">${range}&nbsp;다음 글을 읽고 물음에 답하시오.</p>`
      : "";

    // 지문 이미지 (string 형식 레거시만 — ImageSlot은 [그림A] 토큰으로 인라인 처리)
    const legacyImgs = (g.imageUrls ?? []).filter(
      (item): item is string => typeof item === "string",
    );
    const imgs = legacyImgs.length > 0
      ? `<div style="margin-bottom:6px;">${legacyImgs.map(url =>
          `<img src="${url}" crossorigin="anonymous" style="max-width:100%;max-height:260px;display:block;margin-bottom:4px;object-fit:contain;"/>`
        ).join("")}</div>`
      : "";

    // 이미지 슬롯 맵 — 문단 렌더링에서 [그림A] 토큰 교체에 사용
    const slotMap = buildSlotMap(g.imageUrls ?? []);

    // 핵심 포인트 (전체본)
    const kp = mode === "full" && g.keyPoints
      ? `<p style="margin-top:6px;font-size:8.5pt;color:#555;border-top:1px dashed #bbb;padding-top:4px;"><b style="color:#7c3aed;">핵심</b>&nbsp;${escapeHtml(g.keyPoints)}</p>`
      : "";

    // 지문 — 수능 스타일: 얇은 단색 테두리, 내부 여백 / 구조 레이블([가][대] 등) 제거
    const cleanPassText = g.text ? stripStructuralLabels(g.text) : '';
    // 문단 단위 분리 — break-inside:avoid 없이 orphans/widows 로만 제어
    // (가)/(나) 단독 섹션 마커만 break-after:avoid 로 다음 문단과 묶음
    const passParasHtml = cleanPassText
      ? cleanPassText.split(/\n{2,}/)
          .filter(p => p.trim().length > 0)
          .map(p => {
            const trimmed = p.trim();

            // 단독 [그림A] 문단 → 이미지 블록 (pre-wrap 없이, 중앙 정렬)
            const imageOnlyMatch = trimmed.match(/^\[그림([A-Za-z])\]$/);
            if (imageOnlyMatch) {
              const letter = imageOnlyMatch[1];
              const url = slotMap.get(letter.toUpperCase());
              return url
                ? `<div style="text-align:center;margin:8px 0 10px;">
                     <img src="${url}" crossorigin="anonymous"
                       style="max-width:100%;max-height:240px;object-fit:contain;"/>
                   </div>`
                : `<div style="text-align:center;margin:8px 0 10px;">
                     <span style="display:inline-block;min-width:120px;padding:12px 20px;
                       background:#f3f4f6;border:1.5px dashed #9ca3af;border-radius:2px;
                       font-size:9pt;color:#6b7280;">[그림${letter}]</span>
                   </div>`;
            }

            // 일반 문단 — escapeHtml 후 [그림A] 인라인 토큰 교체, 그 뒤 (가)(나) 볼드
            const styled = applyImageSlotsToHtml(escapeHtml(trimmed), slotMap)
              .replace(/\(([가나다라마바사아자차카타파하])\)/g,
                '<b style="font-size:10.5pt;letter-spacing:0.5px;">($1)</b>');
            const isSectionMarker = /^\(?[가나다라마바사아자차카타파하]\)?$/.test(trimmed);
            const breakStyle = isSectionMarker
              ? 'break-after:avoid;margin-bottom:0.25em;'
              : 'margin-bottom:0.6em;';
            return `<p style="font-size:10pt;line-height:1.95;white-space:pre-wrap;word-break:keep-all;${breakStyle}">${styled}</p>`;
          })
          .join("")
      : "";
    const passBox = hasPass
      ? `<div style="border:1px solid #555;margin-bottom:10px;padding:9px 13px 11px;break-inside:avoid;">
           ${imgs}
           ${passParasHtml}
           ${kp}
         </div>`
      : "";

    // 문제 묶음 — 각 문항 사이 얇은 선, break-inside:avoid 로 단 중간 분리 방지
    const questionsHtml = g.questions
      .map(q => `<div style="break-inside:avoid;">${qHtml(q)}</div>`)
      .join("");

    // 교사용: 현행 로직 유지 (column-span:all 구분선, 자유 흐름)
    if (showAnswerInfo) {
      const sepHtml = gi > 0
        ? `<div style="column-span:all;border-top:2px solid #555;margin:16px 0 10px;"></div>`
        : "";
      return `${sepHtml}${directive}${passBox}${questionsHtml}<div style="height:8px;"></div>`;
    }

    // 학생용: 그룹 래퍼로 감싸 단 상단 시작(a) + 덩어리 묶음(c) 적용
    // gi=0은 break-before:column 제외 (맨 앞 빈 단 방지)
    const groupBorderHtml = gi > 0
      ? `<div style="border-top:2px solid #555;margin-bottom:10px;"></div>`
      : "";
    const breakBeforeStyle = gi > 0 ? "break-before:column;" : "";
    return `<div style="${breakBeforeStyle}break-inside:avoid;">${groupBorderHtml}${directive}${passBox}${questionsHtml}<div style="height:8px;"></div></div>`;
  }).join("");

  // body 자체가 2단 컨테이너 — contentHtml을 직접 삽입
  const columnsHtml = contentHtml;

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

  // 헤더는 Playwright headerTemplate으로 이동 — body는 2단 컨테이너만
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/>
    <style>
      @page{size:A4;}
      *{box-sizing:border-box;margin:0;padding:0;}
      body,table,td,p,span,div,b,strong{
        font-family:'Apple SD Gothic Neo','Malgun Gothic','맑은 고딕','Noto Sans KR',
          'Source Han Sans KR','NanumGothic',sans-serif;
      }
      body{
        font-size:10pt;color:#000;background:#fff;line-height:1.75;
        word-break:keep-all;overflow-wrap:break-word;
        -webkit-print-color-adjust:exact;print-color-adjust:exact;
        padding:2mm 14mm 3mm;
      }
      p{margin:0;padding:0;}
    </style>
    </head><body>

      <!-- 세로 구분선: position:fixed → print 모드에서 매 페이지마다 렌더링
           top:28mm / bottom:10mm 은 route.ts Playwright margin.top/bottom 과 일치해야 함 -->
      <div style="position:fixed;left:calc(50% - 0.5px);top:28mm;bottom:10mm;
                  width:1px;background:#999;
                  -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>

      <!-- 2단 컨테이너 — 모든 페이지에서 동일한 위치에서 시작 (헤더는 headerTemplate에) -->
      <div style="column-count:2;column-gap:22px;column-fill:auto;orphans:3;widows:3;">
        ${columnsHtml}
        ${answerTable ? `<div style="column-span:all;">${answerTable}</div>` : ""}
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
