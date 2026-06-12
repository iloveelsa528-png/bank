# PDF 시험지 생성 시스템 분석

> 작성일: 2026-06-12  
> 대상 독자: 외부 검토자 / 인수인계 담당자  
> 목적: 현재 PDF 생성 구조와 한계를 한 문서에서 파악

---

## 1. PDF 생성 방식

### 핵심 라이브러리

| 패키지 | 버전 | 용도 |
|---|---|---|
| `playwright` | 1.60.0 | 실제 PDF 생성 (헤드리스 Chromium) |
| `jspdf` | ^4.2.1 | **미사용** (코드에 남아 있는 레거시) |
| `html2canvas` | ^1.4.1 | **미사용** (과거 방식, 현재 비활성) |
| `next` | 16.2.7 | App Router 서버 API |
| `react` | 19.2.4 | UI |

### 생성 흐름

```
[클라이언트]
  downloadPdf(data, mode)
    → fetch POST /api/pdf/generate  { data, mode }

[서버 — API Route]
  buildUnifiedHtml(data, mode)   → HTML 문자열
  chromium.launch()              → 헤드리스 Chromium
  page.setContent(html)          → DOM 로드
  page.waitForTimeout(300)       → 폰트 렌더링 대기
  page.pdf({ format: "A4" })     → PDF 바이너리 Buffer
    → HTTP 200  application/pdf
```

### 왜 Playwright를 선택했나

CSS `column-count:2`(2단 레이아웃)는 `html2canvas`가 정상 렌더링하지 못함.  
Playwright는 실제 Chromium 인쇄 엔진을 사용하므로 CSS 컬럼·페이지 분리가 정확하다.

---

## 2. 관련 핵심 파일

| 파일 | 역할 |
|---|---|
| `src/lib/pdf/generate.ts` | PDF용 HTML 전체 빌드. 레이아웃·스타일·OCR 정제·박스 파싱 모두 여기 |
| `src/app/api/pdf/generate/route.ts` | 서버 API — Playwright 실행, PDF 반환 (`maxDuration: 60`) |
| `src/lib/pdf/download.ts` | 클라이언트 — fetch 요청 후 blob 다운로드 트리거 |
| `next.config.ts` | `serverExternalPackages: ['better-sqlite3', 'playwright', ...]` |
| `src/types/pattern-remix.ts` | `PatternBasedQuestion` 타입 정의 |
| `data/exam-maker.db` | SQLite DB. `question_sets.generated_questions`에 JSON 직렬화된 문항 배열 |

### `generate.ts` 내부 구조 (함수 목록)

| 함수 | 위치 | 역할 |
|---|---|---|
| `buildUnifiedHtml()` | export | 전체 HTML 생성 진입점 |
| `stripStructuralLabels()` | 모듈 레벨 | 지문에서 `[가][나][대]` 등 OCR 구조 레이블 제거 |
| `parseRefBox()` | 모듈 레벨 | `question_text`에서 `[보기]`/`[보조 제시문]` 블록 분리 |
| `normalizeRefs()` | `buildUnifiedHtml` 내부 | 선택지·발문의 `[보기]` → `<보기>` 표기 정규화 |
| `qHtml()` | `buildUnifiedHtml` 내부 | 문항 1개 HTML |
| `buildFilename()` | export | PDF 파일명 생성 |
| `buildHtml()` | export (레거시) | TXT 다운로드용 HTML (Playwright 미사용) |

---

## 3. 현재 레이아웃 구조

### 전체 페이지 구조 (A4 세로)

```
┌─────────────────────────────────────────┐
│  padding: 9mm 14mm 13mm                 │
│  ┌─────────────────────────────────────┐│
│  │  학교명   학년   날짜  (8.5pt 중앙) ││
│  │  국어 영역            학생용 (22pt) ││
│  │  ══════════════════════════════════ ││  ← 3.5px solid
│  │  ─────────────────────────────────  ││  ← 1px solid (수능 이중선)
│  │                                     ││
│  │  [2단 컬럼  column-count:2]         ││
│  │   단 간격: 22px / 구분선: 1px solid ││
│  │                                     ││
│  │  (교사용/전체본) 정답표             ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### 2단 컬럼 내부 (지문 그룹당 반복)

```
[구분선 — 두 번째 그룹부터 column-span:all, 2px solid]

[지시문]  [1 ~ 5] 다음 글을 읽고 물음에 답하시오.  (10pt 굵게)

┌─────────────────────────────────────────┐
│  지문 박스  border:1px solid #555       │  ← pre-wrap, line-height:1.95
│  (가)/(나) 마커: <b> 10.5pt 강조        │
│  OCR 구조 레이블 [가][대] 자동 제거     │
└─────────────────────────────────────────┘

[문항 구분선 border-top:1px solid #ddd]

1.  발문 텍스트  [3점]           (10.5pt 굵게)
┌─────────────────────────────────────────┐
│  <보기>  또는  <보조 제시문>            │  ← 1.5px solid, 박스 헤더 중앙 정렬
│  박스 내용 (9.5pt, pre-wrap)            │
└─────────────────────────────────────────┘
    ①  선택지 텍스트 (hanging indent)
    ②  ...
    ③  ...  ← 정답: 굵게·초록 + ★ (교사용)
    ④  ...
    ⑤  ...
   [해설/정답 — 교사용·전체본만 표시]
```

### 렌더링 세부

| 요소 | 처리 방식 |
|---|---|
| 지문 | `white-space:pre-wrap` + `word-break:keep-all` |
| `(가)(나)` 마커 | `escapeHtml` 후 regex → `<b>` 태그 삽입 |
| OCR 구조 레이블 | `^\\s*\\[[가나다라...대소중]\\]\\s*$` 줄 단위 제거 |
| 발문 내 `[보기]` | `normalizeRefs()` → `<보기>` 변환 |
| 보기 박스 파싱 | `parseRefBox()`: 마지막 헤더 위치 탐색, boxContent ≥ 20자면 박스 분리 |
| 선택지 들여쓰기 | `padding-left:1.25em; text-indent:-1.25em` (hanging indent) |
| `[3점]` 표시 | 학생용 + `difficulty === '고난도'`일 때만 표시 |
| 정답 표시 | 교사용·전체본: 정답 번호 초록색 굵게 + ★ |
| 정답표 | 교사용·전체본: 하단 border-top 구분 후 테이블 |

---

## 4. 처리 가능 / 불가능 요소

| 요소 | 가능 여부 | 비고 |
|---|---|---|
| 한글 지문 텍스트 | ✅ | `pre-wrap` + `word-break:keep-all` |
| 5지선다 객관식 | ✅ | hanging indent 적용 |
| 서술형 문항 | ✅ | `choices=[]`, `answer=0` |
| `[보기]` / `[보조 제시문]` 박스 | ✅ | `parseRefBox()` |
| `<보기>` (꺾쇠) 형식 | ✅ | 동일 파싱 |
| `[조건]` / `[참고]` / `[자료]` 박스 | ✅ | `parseRefBox()` 패턴 목록 포함 |
| `(가)(나)` 마커 강조 | ✅ | |
| 2단 컬럼 레이아웃 | ✅ | CSS `column-count:2` |
| 수능 이중 구분선 헤더 | ✅ | |
| 교사용 해설·정답 | ✅ | `showAnswerInfo` 플래그 |
| 다중 지문 그룹 | ✅ | `passages[]` 배열 |
| 지문 이미지 (URL) | ✅ | `<img crossorigin="anonymous">` |
| 페이지 번호 | ❌ | CSS `counter` 미적용, 페이지 번호 없음 |
| 표 (HTML `<table>`) | ❌ | OCR 결과에 표가 있어도 텍스트로만 처리 |
| 수식 / LaTeX | ❌ | 렌더링 라이브러리 없음 |
| 그래프·도식 이미지 | △ | URL 있으면 `<img>` 삽입 가능, OCR 자동 처리 불가 |
| 주석 달린 지문 (번호 삽입) | ❌ | |
| 시 (행갈이 보존) | △ | `pre-wrap`으로 줄바꿈 보존되나 들여쓰기 불정확 |
| Vercel 배포 | ❌ | Playwright가 서버리스 환경 미지원 (아래 6항 참조) |

---

## 5. 입력 데이터 구조

### `PdfData` 인터페이스 (generate.ts:14)

```typescript
interface PdfData {
  title: string;
  school?: string;
  grade?: string;
  area?: string;              // "국어", "영어" 등 → "국어 영역" 형식으로 표시
  patternSetTitle?: string;
  questions: PatternBasedQuestion[];
  createdAt?: string;         // ISO 날짜 문자열
  // 단일 지문 (레거시)
  passageTitle?: string;
  passageText?: string;
  passageImageUrls?: string[];
  keyPoints?: string;
  // 다중 지문 (신규)
  passages?: PassagePdfInfo[];
}
```

### `PatternBasedQuestion` 실제 예시 (DB에서 발췌)

```json
{
  "question_number": 1,
  "question_type": "내용이해",
  "difficulty": "응용",
  "question_text": "다음 지문의 두 논점, 즉 [조세 정책 논쟁]과 [개발도상국의 구조적 불평등]이 공통적으로 드러내는 핵심 주장으로 가장 적절한 것은?",
  "choices": [
    {
      "number": 1,
      "text": "개인의 자유와 소유권은 어떠한 경우에도 공동체의 이익보다 우선되어야 한다.",
      "is_correct": false,
      "reason": "노직의 자유주의적 관점만을 반영하며, 지문 전체의 공통 주장이 아니다."
    },
    {
      "number": 3,
      "text": "불평등한 구조적 조건을 개선하기 위해서는 민주적 절차와 공정한 제도적 개혁이 필요하다.",
      "is_correct": true,
      "reason": "두 논점 모두 제도적 개혁과 공정한 절차의 필요성을 핵심으로 삼는다."
    }
  ],
  "answer": 3,
  "explanation": "조세 정책 부분에서는 민주적 절차를 통한 조세 결정을, 개발도상국 부분에서는 근본적 국제 경제 체계 개혁을 공통적으로 강조한다...",
  "descriptive_answer": "",
  "pattern_reference": "복수 논점의 공통 주장 파악 패턴 적용"
}
```

### `[보기]` 박스가 포함된 `question_text` 예시

AI는 종종 발문과 보기 내용을 `question_text` 한 필드에 이어붙여 반환한다.

```
"question_text": "위 글을 바탕으로 <보기>를 이해한 내용으로 적절하지 않은 것은?\n\n<보기>\n가격 통제 정책은 단기적으로 소비자를 보호할 수 있으나 장기적으로는 시장 왜곡을 유발할 수 있다."
```

`parseRefBox()`가 이를 탐지해 `prompt` + `boxLabel("<보기>")` + `boxContent`로 분리한다.

---

## 6. 알려진 품질 문제

### 6-1. OCR 데이터 품질 (가장 심각)

- **문제**: PDF→OCR 변환 시 불필요한 구조 레이블(`[가][나][대][소][중]`), 페이지 번호, 헤더·푸터 텍스트가 지문에 섞여 들어옴
- **현재 대응**: `stripStructuralLabels()`으로 단독 줄의 `[가][나]...` 제거; `normalizeRefs()`로 `[대][소][중]` 인라인 제거
- **미해결**: 줄 중간에 끼어든 OCR 노이즈, 페이지 번호(예: `- 7 -`), 머리말/꼬리말은 자동 제거 안 됨
- **근본 해결책 없음**: 사용자가 저장 전 OCR 결과를 편집할 수 있는 UI가 없음

### 6-2. Vercel 배포 불가

- **문제**: Playwright는 전체 Chromium 바이너리가 필요하므로 Vercel 서버리스 함수(250MB 제한)에서 동작 불가
- **현재 상태**: 로컬 개발 서버에서만 작동
- **해결 방법(미구현)**: `@sparticuz/chromium` + `playwright-core`로 교체 필요 (Vercel Lambda 최적화 Chromium)

### 6-3. 페이지 번호 없음

- 수능·모의고사 형식에서 필수인 페이지 번호가 없음
- CSS `@page` + `counter(page)` 방식 또는 Playwright `headerTemplate`/`footerTemplate` 옵션으로 추가 가능하나 미적용

### 6-4. `[보기]` 박스 파싱 실패 케이스

- `parseRefBox()`는 "박스 헤더 직전이 문장 끝(`.!?`) 또는 줄바꿈"인 패턴만 인식
- AI가 `"윗글에서 [보기]의 ㉠과 유사한 사례를..."` 형태로 보기를 발문 중간에 넣으면 박스 처리 안 됨 (발문에 `<보기>` 텍스트만 인라인으로 출력됨)

### 6-5. 단 컬럼 깨짐

- `column-count:2` 환경에서 `break-inside:avoid`를 문항 div에 적용했으나, 지문 박스 + 문항이 함께 잘리는 경우 레이아웃이 어색할 수 있음
- 지문이 매우 길면 1단 전체를 차지해 문제들이 모두 2단으로 밀림

### 6-6. 서체 의존성

- 폰트 스택: `'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'NanumGothic', sans-serif`
- Playwright가 실행되는 서버(Linux)에 이 폰트들이 없으면 폴백 sans-serif로 렌더링 → 한글 자간·줄간이 달라짐
- 로컬 macOS 개발 환경에서는 Apple SD Gothic Neo 사용 → 서버 배포 시 폰트 별도 설치 필요

### 6-7. 타임아웃 리스크

- `maxDuration: 60` (초) 설정 — 지문+문항이 많거나 Chromium 기동이 느린 환경에서는 타임아웃 발생 가능
- Vercel 무료 플랜은 `maxDuration` 10초 제한

---

## 7. 그림/도식이 필요한 문항 처리 방식

### 현재 지원 범위

| 케이스 | 처리 가능 여부 | 방법 |
|---|---|---|
| 이미지 URL이 있는 경우 | ✅ | `passageImageUrls[]` 또는 `passages[].imageUrls[]`에 URL 넣으면 `<img>` 삽입 |
| OCR로 추출된 텍스트 도식 | △ | 텍스트 그대로 `pre-wrap`으로 출력 (정렬 불보장) |
| 표 (markdown/HTML) | ❌ | 렌더링 변환 없음 — 텍스트로만 표시 |
| LaTeX / 수식 | ❌ | MathJax/KaTeX 미도입 |
| 직접 그린 도형 | ❌ | 지원 없음 |

### 이미지 삽입 방법 (현재)

```typescript
// passages 배열의 imageUrls 필드에 URL 배열로 전달
const pdfData: PdfData = {
  passages: [{
    text: "...",
    imageUrls: ["https://...jpg"],   // ← 여기에 이미지 URL
    startQuestionIdx: 0,
    questionCount: 3,
  }],
  questions: [...],
};
```

HTML에서는 다음과 같이 렌더링됨:

```html
<img src="https://..." crossorigin="anonymous"
     style="max-width:100%;max-height:260px;display:block;object-fit:contain;" />
```

### 한계

- `crossorigin="anonymous"` 설정이 있으나, Playwright 실행 서버에서 해당 URL에 접근 불가하면 이미지 깨짐 (CORS 또는 네트워크 이슈)
- 문제 본문(question_text) 안의 그림은 지원 없음 — 이미지가 필요한 문항은 현재 시스템으로 출제 불가
- 수능 기출처럼 문항 중간에 그래프·지도·사진이 들어가는 형식은 완전히 미지원

---

## 요약

| 항목 | 상태 |
|---|---|
| PDF 생성 핵심 | Playwright 1.60.0, HTML→Chromium print |
| 레이아웃 | A4, 2단 컬럼, 수능 이중 구분선 |
| 텍스트 처리 | OCR 노이즈 부분 정제, 보기 박스 파싱 |
| 로컬 동작 | ✅ |
| Vercel 배포 | ❌ (Chromium 크기 제한) |
| 페이지 번호 | ❌ |
| 표/수식/그림 삽입 | ❌ (URL 이미지만 가능) |
| OCR 편집 UI | ❌ (미구현) |
