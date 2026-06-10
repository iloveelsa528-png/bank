# PROJECT REVIEW — 국어 문제 뱅크 (bank)

> 작성일: 2026-06-10  
> 배포 URL: https://bank-beta-six.vercel.app  
> GitHub: https://github.com/iloveelsa528-png/bank

---

## 1. 프로젝트 목적

### 이 프로그램이 무엇인가
국어 교사가 **기출 시험지 이미지를 업로드하면**, AI(Claude)가 문제를 자동으로 분석하고, **새로운 지문에 동일한 출제 패턴의 문제를 자동 생성**해주는 도구입니다.

### 사용자 흐름
1. **시험지 이미지 업로드** (JPG/PNG, 여러 장 가능)
2. **OCR** — Claude Vision API가 이미지에서 텍스트 추출
3. **구조화 + 패턴 분석** — 지문/문제번호/발문/선택지/정답을 분리하고, 출제 패턴 추출
4. **새 지문 등록** — 교과서 본문, 문학 작품, 독서 지문 등 입력
5. **문제 자동 생성** — 추출된 패턴 × 새 지문 → AI가 새 문제 세트 생성
6. **편집 · 저장 · 공유** — 생성된 문제 수정, PDF 다운로드, 링크 공유

### 최종 목표
- 교사가 기출 스타일을 학습시키면, 새 지문에 자동으로 동일 스타일의 문제를 생성
- 직접 문제 제작 시간 단축
- 이웃(동료 교사)과 자료 공유

---

## 2. 현재까지 구현된 기능

### ✅ 실제 작동하는 기능
| 기능 | 설명 |
|------|------|
| 구글 로그인 | Supabase Auth + Google OAuth |
| 시험지 OCR | 이미지 → Claude Vision → 텍스트 추출 |
| 기출 구조화 + 패턴 추출 | OCR 텍스트 → 지문/문제/선택지 분리 + 출제 패턴 분석 (단일 Claude 호출) |
| 패턴 세트 저장 | 분석 결과를 DB에 저장, 라이브러리 관리 |
| 지문 등록 + 분석 | 새 지문 입력, Claude가 핵심 논거/출제 포인트 분석 |
| 지문 라이브러리 | 등록된 지문 목록, 검색 |
| 문제 자동 생성 | 패턴 세트 × 지문 → Claude가 5문항 생성 |
| 문제 편집 | 생성된 문제 수정, 문항 제외, 정답 변경 |
| 문제 저장 | 생성된 문제 세트를 DB에 저장 |
| 공유 링크 | 문제 세트를 토큰 기반 URL로 공유 (공개/이웃 전용/링크만) |
| PDF 다운로드 | 문제 세트를 PDF로 저장 |
| 이웃 기능 | 이메일로 검색, 이웃 신청/수락/거절/끊기 |
| 자료 탐색 | 공개 문제 세트 브라우징, 영역 필터, 제목 검색 |
| 인앱 브라우저 감지 | 카카오톡 등 인앱 브라우저 접속 시 외부 브라우저 안내 |
| 반응형 UI | 하단 탭바, 초록 테마, 모바일 대응 |

### ⚠️ 부분적으로 작동하는 기능
| 기능 | 상태 |
|------|------|
| 다중 페이지 OCR + 분석 | 3~4장은 가능, 5장 이상 시 Vercel 60초 타임아웃 위험 |
| 서술형 문제 생성 | 생성은 되지만 정답 검증 로직 없음 |
| 기출 문제 뱅크(구 방식) | `/problems` 경로로 접근 가능하지만 UI 연결 약함 |

### ❌ 아직 구현되지 않은 기능
| 기능 | 설명 |
|------|------|
| 7단계: 기출 패턴 누적 학습 | 같은 학교 기출을 여러 개 쌓아 패턴 신뢰도 향상 (`BACKLOG.md`) |
| 문제 출력 인쇄 최적화 | 프린트 레이아웃 미구현 |
| 알림 기능 | 이웃 신청 실시간 알림 없음 |
| 문제 자동 번호 재정렬 | 문항 제외 시 번호 수동 관리 |

---

## 3. 현재 기술 스택

| 분류 | 사용 기술 |
|------|----------|
| **프레임워크** | Next.js 16.2.7 (App Router, Turbopack) |
| **언어** | TypeScript 5 |
| **스타일** | Tailwind CSS 4 |
| **런타임** | React 19 |
| **AI API** | Anthropic Claude claude-sonnet-4-6 (OCR, 구조화, 분석, 생성) |
| **DB + Auth** | Supabase (PostgreSQL + Google OAuth) |
| **Supabase 클라이언트** | @supabase/ssr 0.12, @supabase/supabase-js 2.108 |
| **PDF** | jsPDF 4.2.1 + html2canvas 1.4.1 |
| **배포** | Vercel Hobby 플랜 |
| **라우팅** | Next.js App Router (`src/app/` 기반) |
| **미들웨어** | `src/proxy.ts` (인증 리다이렉트) |

---

## 4. 현재 폴더 구조

```
src/
├── app/
│   ├── layout.tsx                    # 루트 레이아웃 (ClientShell 포함)
│   ├── page.tsx                      # 홈 대시보드
│   ├── login/page.tsx                # 구글 로그인
│   ├── explore/page.tsx              # 공개 자료 탐색
│   ├── neighbors/page.tsx            # 이웃 관리 + 이메일 검색
│   ├── profile/[userId]/page.tsx     # 유저 프로필
│   ├── share/[token]/page.tsx        # 공유 링크 뷰어 (비로그인 가능)
│   ├── problems/                     # 구 문제뱅크 (1~4단계 레거시)
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── pattern-remix/                # 핵심 기능 (기출 분석 → 문제 생성)
│   │   ├── page.tsx                  # 1단계: OCR + 구조화 + 패턴 추출
│   │   ├── library/page.tsx          # 저장된 패턴 세트 목록
│   │   └── generate/
│   │       ├── page.tsx              # 2단계: 패턴 × 지문 → 문제 생성
│   │       ├── library/page.tsx      # 생성된 문제 세트 목록
│   │       └── [id]/edit/page.tsx    # 문제 편집
│   ├── source-passages/              # 지문 관리
│   │   ├── page.tsx                  # 지문 등록 + 분석
│   │   └── library/page.tsx          # 지문 목록
│   └── api/
│       ├── ocr/route.ts              # 이미지 → Claude Vision OCR
│       ├── patterns/
│       │   ├── analyze-all/route.ts  # OCR 텍스트 → 구조화+패턴 (핵심, maxDuration=60)
│       │   └── extract/route.ts      # 패턴 추출 단독 (레거시)
│       ├── pattern-sets/             # 패턴 세트 CRUD
│       ├── source-passages/
│       │   ├── route.ts              # 지문 CRUD
│       │   └── analyze/route.ts      # 지문 분석 (maxDuration=60)
│       ├── pattern-based-questions/  # 생성된 문제 세트 CRUD
│       ├── pattern-remix/generate/route.ts  # 문제 생성 (maxDuration=300 → 실제 60)
│       ├── share/[token]/route.ts    # 공유 토큰 조회
│       ├── explore/route.ts          # 공개 자료 탐색
│       ├── neighbors/                # 이웃 관리 API
│       │   ├── route.ts
│       │   ├── [id]/route.ts
│       │   └── search/route.ts       # 이메일로 이웃 검색
│       └── profile/
│           ├── [userId]/route.ts
│           └── sync/route.ts         # 로그인 시 프로필 자동 동기화
├── components/
│   ├── ClientShell.tsx               # 전역 래퍼: 인앱브라우저 감지 + 하단탭바
│   ├── BottomNav.tsx                 # 하단 탭 네비게이션 (홈/탐색/내자료/이웃)
│   ├── AuthUserMenu.tsx              # 로그인 상태 감지 + 프로필 동기화
│   ├── UserMenu.tsx                  # 유저 드롭다운 메뉴
│   ├── ImageUploader.tsx             # 이미지 드래그앤드롭 업로드
│   ├── OCREditor.tsx                 # OCR 결과 텍스트 편집기
│   ├── AnalysisView.tsx              # 패턴 분석 결과 뷰
│   ├── GenerationView.tsx            # 문제 생성 결과 뷰
│   ├── StructuredView.tsx            # 구조화 결과 뷰
│   ├── SaveModal.tsx                 # 저장 모달
│   └── PdfDownloadButtons.tsx        # PDF 다운로드 버튼
├── lib/
│   ├── supabase.ts                   # Supabase 싱글턴 (서버)
│   ├── supabase-server.ts            # 서버 컴포넌트용 Supabase
│   ├── supabase-browser.ts           # 클라이언트용 Supabase (globalThis 싱글턴)
│   └── pdf/
│       ├── generate.ts               # PDF 생성 로직
│       └── download.ts               # PDF 다운로드 헬퍼
├── types/
│   ├── index.ts                      # 구 타입 정의
│   ├── patterns.ts                   # 패턴/기출 관련 타입
│   ├── passages.ts                   # 지문 관련 타입
│   └── pattern-remix.ts              # 문제 생성 관련 타입
├── context/
│   └── AppContext.tsx                # 구 상태관리 (1~4단계 레거시)
└── proxy.ts                          # 인증 미들웨어 (middleware.ts 대신 사용)
```

---

## 5. 핵심 기능 흐름

### 기출문제 분석 흐름 (`/pattern-remix`)
```
1. 사용자가 시험지 이미지(JPG/PNG) 업로드
2. POST /api/ocr
   → FormData로 이미지 전송
   → Claude Vision (claude-sonnet-4-6) 이 각 이미지에서 텍스트 추출
   → 여러 이미지를 하나의 텍스트로 합침
3. 사용자가 OCR 결과 확인 + 수정 가능
4. "구조화 + 패턴 추출 시작" 클릭
5. POST /api/patterns/analyze-all
   → OCR 텍스트 전체를 Claude에 단일 호출
   → JSON Schema 기반 출력으로 구조화 + 패턴 동시 추출
   → 반환: { groups: [{ 지문, 문제목록, 패턴 }] }
6. 사용자가 결과 확인 → 저장
7. POST /api/pattern-sets → Supabase에 저장
```

### 새 지문 분석 흐름 (`/source-passages`)
```
1. 지문 텍스트 직접 입력 또는 이미지 OCR
2. POST /api/source-passages/analyze
   → Claude가 지문 요약, 핵심 논거, 출제 가능 포인트 분석
3. 결과 확인 후 POST /api/source-passages → DB 저장
```

### 문제 생성 흐름 (`/pattern-remix/generate`)
```
1. 저장된 패턴 세트 선택
2. 저장된 지문 선택
3. 문항 수 / 유형 / 난이도 설정
4. POST /api/pattern-remix/generate
   → 패턴 + 지문 + 설정을 Claude에 전달
   → 문제 세트 JSON 반환
5. 문제 편집 (발문 수정, 선택지 수정, 문항 제외)
6. POST /api/pattern-based-questions → DB 저장
```

### 공유 흐름
```
1. 문제 세트 저장 시 visibility 설정 (public/neighbors/link_only)
2. 공유 토큰(share_token) 자동 생성
3. /share/[token] 으로 접근 가능
4. neighbors 설정 시 → 서로이웃만 열람 가능
5. GET /api/share/[token] → 권한 확인 → 데이터 반환
```

---

## 6. 현재 발생한 문제

### 🔴 Vercel 함수 타임아웃
- **증상**: "Unexpected token 'A'... is not valid JSON" alert
- **원인**: Vercel Hobby 플랜의 serverless 함수 실행 상한 = 60초. 5장 이상 OCR + 분석 시 초과
- **현재 대응**: maxDuration=60 설정, 응답이 JSON 아닐 때 한국어 안내 메시지 표시
- **한계**: 근본 해결 안 됨. 페이지 수 줄이거나 Pro 업그레이드 필요

### 🔴 카카오톡 인앱 브라우저 Google OAuth 차단
- **증상**: `403: disallowed_useragent`
- **원인**: Google이 WebView/인앱 브라우저에서의 OAuth를 정책상 차단
- **현재 대응**: ClientShell에서 인앱 브라우저 감지 후 외부 브라우저 유도 화면 표시
- **상태**: ✅ 해결

### 🟡 GoTrueClient 중복 인스턴스 경고
- **증상**: 개발 환경에서 콘솔 경고
- **원인**: React Strict Mode가 컴포넌트를 두 번 실행
- **현재 대응**: `reactStrictMode: false` 설정 + `globalThis` 싱글턴 패턴
- **상태**: ✅ 해결 (개발 편의 목적)

### 🟡 Vercel 첫 배포 실패
- **증상**: 환경변수 없이 배포 → "Collecting page data" 단계에서 실패
- **원인**: `.env.local`이 gitignore 처리됨
- **현재 대응**: Vercel 대시보드에서 수동으로 3개 환경변수 추가
- **상태**: ✅ 해결

### 🟡 `useSearchParams` Suspense 오류
- **증상**: 빌드 시 "useSearchParams() should be wrapped in a suspense boundary" 오류
- **원인**: Next.js App Router에서 `useSearchParams`는 반드시 `<Suspense>` 필요
- **현재 대응**: 해당 페이지를 `Inner` + `Suspense wrapper` 패턴으로 분리
- **상태**: ✅ 해결

### 🟡 Supabase `upsert` ignoreDuplicates 문제
- **증상**: 이메일 컬럼이 업데이트되지 않음
- **원인**: `ignoreDuplicates: true` 설정 시 기존 행을 업데이트하지 않음
- **현재 대응**: `ignoreDuplicates` 옵션 제거
- **상태**: ✅ 해결

---

## 7. 현재 코드 구조의 한계

### 한 번의 요청에서 너무 많은 일 처리
- `/api/patterns/analyze-all`: OCR 텍스트 전체(5~10페이지 분량)를 Claude에 단일 호출
  - 입력 토큰이 매우 많아 응답 시간 30~60초
  - Vercel 60초 제한과 충돌

### AI 호출이 오래 걸리는 부분
| API | 소요 시간 | 비고 |
|-----|----------|------|
| `/api/ocr` (5장) | 30~50초 | 이미지당 Claude Vision |
| `/api/patterns/analyze-all` | 20~60초 | 텍스트 길이에 따라 급증 |
| `/api/pattern-remix/generate` | 20~40초 | 문항 수 많을수록 증가 |

### 페이지 수가 많아질 때 취약
- 현재 구조는 모든 페이지의 OCR을 합친 텍스트를 **한 번에** Claude에 전달
- 페이지 수 ∝ 입력 토큰 수 ∝ 응답 시간 → 선형이 아닌 지수적 증가 가능

### 비용이 커질 수 있는 부분
- OCR + 분석 + 생성 = 사용자 1회 작업에 Claude API 3회 호출
- 각 호출의 입력/출력 토큰이 크면 비용 급증
- 현재 토큰 사용량 모니터링 없음

### 유지보수하기 어려운 부분
- `pattern-remix/page.tsx`: 한 파일에 OCR, 편집, 분석, 저장 로직이 모두 있음 (600줄+)
- `AppContext.tsx`: 구 방식 상태관리가 남아 있어 신/구 코드가 혼재
- `/api/problems`, `/api/analyze`, `/api/generate`, `/api/structure`: 구 방식 API가 삭제되지 않고 잔존
- `maxDuration = 300`으로 설정된 곳이 있으나 Hobby 플랜에서 60초로 조용히 무시됨

---

## 8. 앞으로 개선해야 할 구조

### 단기 (현재 구조 유지하며 안정화)
- [ ] OCR + 분석을 **페이지 단위로 나눠 처리** (chunk processing)
- [ ] 진행 상태를 클라이언트에 실시간으로 표시 (Server-Sent Events 또는 폴링)
- [ ] 레거시 API(`/api/analyze`, `/api/generate`, `/api/structure`) 정리
- [ ] `AppContext.tsx` 제거

### 중기 (구조 개선)
- [ ] 기출 분석(`/pattern-remix`)과 문제 생성(`/pattern-remix/generate`) 로직을 완전히 분리
- [ ] 긴 AI 작업은 **background job** 방식으로 전환 (Supabase Edge Functions 또는 Queue)
  - 사용자가 요청 → 즉시 작업 ID 반환 → 클라이언트가 주기적으로 상태 폴링
- [ ] 작업 상태 DB 저장 (`jobs` 테이블 추가)

### 장기 (배포 환경 개선)
- [ ] Vercel Pro 업그레이드 또는 Railway/Render로 마이그레이션 (타임아웃 해결)
- [ ] 토큰 사용량 로깅 및 비용 모니터링 추가
- [ ] 7단계(기출 패턴 누적 학습) 구현

---

## 9. 환경변수와 실행 방법

### 필요한 환경변수 (`.env.local`)
```env
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 로컬 설치 및 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 프로덕션 빌드 테스트
npm run build && npm start
```

### Vercel 배포 시 필요한 설정
1. GitHub 연결 후 `main` 브랜치 배포
2. Vercel 대시보드 → Environment Variables에 위 3개 변수 추가
3. Supabase → Authentication → URL Configuration
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**`

### Supabase 필요 테이블
- `problems` — 구 문제 저장
- `user_profiles` — 유저 프로필 (id, display_name, email)
- `neighbor_requests` — 이웃 신청 (requester_id, target_id, status)
- `exam_pattern_sets` — 기출 패턴 세트
- `source_passages` — 지문
- `pattern_based_questions` — 생성된 문제 세트

---

## 10. ChatGPT에게 물어볼 질문

### 구조 관련
1. **현재 구조를 유지해도 되는가?**
   - `pattern-remix/page.tsx` 한 파일에 OCR/편집/분석/저장이 모두 있는데, 이 정도 규모에서 분리가 필요한가?

2. **긴 AI 작업을 어떻게 처리해야 하는가?**
   - 현재: 동기 HTTP 요청 → Vercel 60초 제한에 걸림
   - 대안 A: Server-Sent Events로 스트리밍
   - 대안 B: Supabase에 job 저장 → 클라이언트 폴링
   - 대안 C: Vercel Pro 업그레이드
   - 어떤 게 가장 현실적인가?

3. **chunk 단위 처리 설계 방법**
   - 시험지 5장을 한 번에 분석하는 대신 1~2장씩 나눠 분석하고 결과를 합치려면 어떻게 구현해야 하는가?

### 배포 관련
4. **Vercel Hobby 플랜을 계속 써도 되는가?**
   - 60초 제한이 핵심 기능(OCR + 분석)과 충돌함
   - Pro($20/월) vs Railway/Render vs 로컬 MVP 전환 중 무엇이 나은가?

5. **Supabase 구조가 적절한가?**
   - 현재 `exam_pattern_sets`에 전체 분석 JSON을 JSONB로 저장
   - 데이터가 많아지면 문제가 생기는가?

### 다음 개발 방향
6. **다음 개발 순서**
   - 현재 사용자(교사)가 가장 원하는 기능부터 순서를 정하면?
   - (a) 타임아웃 해결 → (b) 기출 패턴 누적 학습 → (c) 인쇄 최적화 → (d) 알림 기능

7. **레거시 코드 정리 시점**
   - `/api/analyze`, `/api/generate`, `/api/structure`, `AppContext.tsx` 등 구 코드를 언제 지워야 하는가?
