# 파이프라인 통합 설계안

> 작성일: 2026-06-12  
> 상태: 계획 단계 (코드 미수정)

---

## 1. 현재 구조 — 두 파이프라인이 하는 일

### 1단계 파이프라인 (기출 분석)

```
진입점: /pattern-remix  (이미지 업로드)
         ↓
POST /api/uploads/exam
  → createExamOcrJob()  [driver.ts]
  → runExamPipeline()   [processing/exam.ts]

  Phase 1  OCR          lib/ai/ocr.ts
           이미지별 텍스트 추출 → 전부 이어붙임 → allOcrText

  Phase 2  Segment      lib/ai/segment.ts
           AI(Haiku)가 지문 경계 탐지 → startsWith 마커로 슬라이싱
           → groups[] (각 그룹은 하나의 지문+문항 덩어리)

  Phase 3  Analyze      lib/ai/analyze.ts  (그룹별 병렬)
           AI(Sonnet)가 그룹 텍스트에서 동시에 추출:
             passageContent  — 지문 본문만
             questions[]     — 발문·선택지
             patterns[]      — 각 문항의 출제 패턴 메타데이터

  Phase 4  Finalize
           인메모리 job에 { groups: analyzeResults, ocrRawText } 저장

사용자가 UI(ExamResultView)에서 확인 → 저장 버튼
  → POST /api/pattern-sets
  → DB: pattern_sets + exam_patterns
```

**저장되는 것**: 패턴 메타데이터(`exam_patterns`)  
**저장 안 되는 것**: passageContent, questions 원문, ocrRawText

---

### 2단계 파이프라인 (새 지문 등록 + 문제 생성)

```
진입점 A: /source-passages  (이미지 업로드)
  POST /api/ocr  → 단순 OCR, 분할 없음 → 사용자 textarea에 표시

진입점 B: /source-passages  (텍스트 직접 붙여넣기)
  사용자가 직접 입력

공통 분석 경로:
  POST /api/source-passages/analyze-job
    → createPassageAnalyzeJob()         [driver.ts]
    → runPassagePipeline()              [processing/passage.ts]
    → runPassageAnalyzeChunk()          [lib/ai/passage.ts]  ← analyze.ts와 다른 AI 로직
    결과: { analysis_summary, key_points, candidate_question_points }
    ※ segment 단계 없음

저장:
  POST /api/source-passages
  → DB: source_passages 테이블
    (passage_text, ocr_raw_text, analysis_summary, key_points, ...)

문제 생성:
  POST /api/pattern-remix/generate-job
    → passage_text + key_points + exam_patterns → AI → 문항 생성
```

**문제점**: `passage_text`(수동 편집된 1개 지문)와 `key_points`(전체 OCR 기반 분석)가 서로 다른 텍스트를 기반으로 만들어질 수 있음 → 문제-지문 불일치

---

### 두 파이프라인의 핵심 차이

| | 1단계 | 2단계 |
|---|---|---|
| OCR | ocr.ts (이미지 다수) | /api/ocr (단순, 단일) |
| 분할(Segment) | **있음** (segment.ts) | **없음** |
| 분석 AI | analyze.ts | passage.ts (다른 로직) |
| 결과 저장 | pattern_sets + exam_patterns | source_passages |
| passageContent | analyze에서 추출하나 **저장 안 함** | passage_text로 저장 |

---

## 2. 통합 설계안

### 핵심 원칙

1. **새 지문도 1단계와 동일한 OCR→Segment→Analyze 파이프라인을 거친다**
2. **analyze.ts 한 번의 실행으로 패턴 추출 + 지문 정제 + 분석 메타 모두 산출**
3. **1단계·2단계가 같은 분석 결과 구조를 공유하고, DB에서 연결될 수 있다**

### 목표 흐름 (통합 후)

```
1단계 — 기출 분석
  이미지 업로드
    → OCR → Segment → Analyze
    → 결과: groups[] (각 그룹 = passageContent + patterns + 분석 메타)
    → 사용자 확인
    → 저장:
        exam_patterns     ← 기존과 동일
        source_passages   ← 신규: passageContent 저장 (선택적)

2단계 — 새 지문 등록
  이미지 업로드 OR 텍스트 입력
    → (이미지면) OCR
    → Segment         ← 신규 추가
    → Analyze         ← 기존 1단계와 동일한 analyze.ts 재사용
    → 결과: 지문 그룹 N개 표시
    → 사용자가 원하는 그룹 1개 선택
    → source_passages에 저장
        passage_text = 선택된 그룹의 passageContent
        analysis_summary / key_points = 해당 그룹만의 분석 메타

3단계 — 문제 생성 (변경 없음)
  source_passage 선택 + exam_patterns 선택
    → passage_text + key_points → AI → 문항 생성
    ※ 이제 passage_text와 key_points가 동일 지문 기반 → 불일치 해소
```

### DB 변경 없음

현재 테이블 구조로 충분합니다.

```
source_passages (기존)
  passage_text         ← analyze.ts의 passageContent로 채워짐
  ocr_raw_text         ← allOcrText 그대로 유지
  analysis_summary     ← 해당 그룹의 분석 요약만
  key_points           ← 해당 그룹의 핵심 내용만

exam_patterns (기존)
  pattern_set_id → pattern_sets → source_job_id
  (1단계 저장 시 source_passage_id를 pattern_sets에 추가하면 연결 가능 — 선택)
```

---

## 3. 단계별 작업 계획

총 4단계. 각 단계 완료 시 동작 확인 후 다음 단계 진행.

---

### 단계 1 — Segment 실패 명시화

**목표**: 분할 실패가 조용히 넘어가는 버그를 없애고 사용자에게 알린다.

**변경 파일**: `src/lib/ai/segment.ts` (1곳)

**변경 내용**:
- `SegmentResult`에 `segmentFailed: boolean` 플래그 추가
- fallback 발동 시 (`groups = [{ text: allOcrText }]`) 해당 플래그를 `true`로 설정
- `ExamResultView.tsx`에 경고 배너 추가 (segmentFailed이면 "분할 실패 — 지문이 통째로 묶여 있습니다. 이미지를 지문별로 나눠서 재업로드하세요")

**위험**: 없음. 기존 파이프라인 동작 변경 없음. 플래그 추가만.

**확인 방법**: 여러 지문이 섞인 이미지 업로드 → 경고 배너 표시 여부

---

### 단계 2 — /source-passages 이미지 입력에 Segment 적용

**목표**: 이미지로 새 지문을 입력할 때 1단계와 동일한 OCR→Segment→Analyze를 거쳐 여러 지문을 자동으로 분리한다.

**변경 파일**: 
- `src/app/source-passages/page.tsx` — 이미지 업로드 경로만 변경
- `src/app/api/uploads/exam/route.ts` — 이미지 받는 API (재사용)
- `src/lib/processing/exam.ts` — 재사용 (변경 없음)
- `src/lib/ai/analyze.ts` — 재사용 (변경 없음)

**변경 내용**:
- 현재: 이미지 → `POST /api/ocr` → 텍스트 반환
- 변경: 이미지 → `POST /api/uploads/exam` → `exam_ocr_analyze` job → job 완료 대기 → groups 표시
- 사용자가 그룹 목록에서 하나 선택 → 해당 그룹의 `passageContent`가 `passage_text`로 세팅
- 선택된 그룹의 분석 메타 (`analysis_summary`, `key_points` → passage.ts 대신 analyze.ts 결과 재사용)

**패스트 패스 (텍스트 직접 입력 경로)**: 변경 없음. 기존 `/analyze-job` 유지.  
단, 향후 단계 3에서 텍스트 입력도 segment 거치도록 확장 가능.

**위험**: 
- `/source-passages` 페이지 UI가 크게 바뀜 (기존 "OCR → 텍스트 표시" 흐름 → "그룹 선택" 흐름)
- `exam.ts` 결과의 `passageContent`가 비어있을 경우 대비 필요

**확인 방법**: 여러 지문이 섞인 시험지 이미지 업로드 → 지문 그룹 N개 표시 → 하나 선택 → 저장된 `passage_text`가 선택한 지문만 포함하는지 DB 확인

---

### 단계 3 — 1단계 저장 시 passageContent도 source_passages에 보존

**목표**: 1단계 기출 분석 완료 후 패턴을 저장할 때, 각 그룹의 지문 본문도 `source_passages`에 함께 저장하여 나중에 2단계에서 재사용할 수 있게 한다.

**변경 파일**:
- `src/components/pattern/ExamResultView.tsx` — 저장 로직 확장
- `src/app/api/pattern-sets/route.ts` — 응답에 source_passage_id 포함 (선택)

**변경 내용**:
- `handleSaveAll()` 루프에서 패턴 저장 직전, 해당 그룹의 `passageContent`를 `source_passages`에 저장
- 저장된 `source_passage_id`를 `pattern_sets`의 연관 필드로 기록 (현재 `source_job_id`만 있음)
- UI: 저장 완료 후 "이 지문으로 새 문제 만들기 →" 버튼 추가

**위험**: 
- `exam_patterns`와 `source_passages`가 1:1로 연결되는 것처럼 보이지만 실제로는 여러 패턴 세트가 같은 지문을 공유할 수 있음 → 중복 저장 방지 로직 필요

**확인 방법**: 기출 시험지 업로드 → 패턴 저장 → `source_passages`에 지문 자동 생성 여부 확인 → 2단계에서 해당 지문으로 문제 생성 가능한지 확인

---

### 단계 4 — 기존 오염 데이터 수동 정제 UI

**목표**: 이미 저장된 `source_passages` 중 `passage_text`와 `key_points`가 불일치하는 레코드를 사용자가 직접 수정할 수 있게 한다.

**변경 파일**:
- `src/app/source-passages/library/page.tsx` — 편집 기능 추가
- `src/app/api/source-passages/[id]/route.ts` — PATCH 메서드 추가

**변경 내용**:
- 라이브러리 페이지에서 각 지문 레코드 클릭 → 인라인 편집
- `passage_text` 수정 가능 textarea
- "이 지문으로 분석 재실행" 버튼 → `passage_text` 기반으로 `analysis_summary` + `key_points` 재생성 후 업데이트
- 저장 전 현재 `passage_text` vs `key_points` 길이 비율 경고 표시 (비율이 너무 다르면 "데이터 불일치 가능성" 알림)

**위험**: 
- 기존 데이터 수정이므로 사용자가 실수로 데이터 삭제 가능 → 편집 전 확인 다이얼로그 필요

**확인 방법**: 기존 오염된 레코드 수정 → 해당 지문으로 문제 생성 → 지문 내용과 문제 일치 확인

---

## 4. 작업 우선순위 및 비용-위험 평가

| 단계 | 작업량 | 기존 코드 영향 | 사용자 가치 | 권장 순서 |
|---|---|---|---|---|
| 단계 1 (Segment 경고) | 소 (2파일, ~20줄) | 없음 | 중 (오류 조기 감지) | **먼저** |
| 단계 2 (/source-passages 통합) | 중 (1파일 대수술) | source-passages UI | 최대 (근본 해결) | 두 번째 |
| 단계 3 (1단계 → source_passages) | 중 (1파일 확장) | ExamResultView | 중 (편의성) | 세 번째 |
| 단계 4 (편집 UI) | 중 | library 페이지 신규 | 중 (기존 데이터 수정) | 마지막 |

---

## 5. 건드리지 않는 것

다음은 이 통합 작업에서 변경하지 않는다.

- `lib/ai/ocr.ts` — OCR 로직
- `lib/ai/segment.ts` — 분할 로직 본체 (단계 1에서 플래그만 추가)
- `lib/ai/analyze.ts` — 분석 로직
- `lib/ai/generate.ts` — 문제 생성 로직
- `lib/pdf/generate.ts` — PDF 생성·박스 처리
- `processing/exam.ts` — 1단계 파이프라인 본체 (재사용)
- `app/api/pdf/*` — PDF API
- `app/api/pattern-sets/*` — 패턴 저장 API
- `app/api/pattern-remix/generate-job/*` — 문제 생성 API
