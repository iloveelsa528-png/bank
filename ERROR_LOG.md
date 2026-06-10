# ERROR LOG — 국어 문제 뱅크 (bank)

> 작성일: 2026-06-10  
> 발생 순서대로 기록

---

## ERR-001 · `useSearchParams()` Suspense 경계 오류

| 항목 | 내용 |
|------|------|
| **오류 메시지** | `useSearchParams() should be wrapped in a suspense boundary at page "/pattern-remix/generate"` |
| **발생 상황** | Next.js 프로덕션 빌드(`npm run build`) 시 |
| **원인** | Next.js 16 App Router에서 `useSearchParams()`는 반드시 `<Suspense>` 경계 안에서만 사용 가능 |
| **해결 방법** | 페이지 컴포넌트를 `Inner` 컴포넌트와 `Suspense`로 감싼 `default export`로 분리 |
| **해결 여부** | ✅ 해결 |
| **남은 문제** | 없음 |

**해결 코드 패턴:**
```tsx
function PageInner() {
  const searchParams = useSearchParams(); // 여기서 사용
  // ...
}

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <PageInner />
    </Suspense>
  );
}
```

---

## ERR-002 · GoTrueClient 중복 인스턴스 경고

| 항목 | 내용 |
|------|------|
| **오류 메시지** | `Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.` |
| **발생 상황** | 개발 환경에서 페이지 이동 또는 HMR(핫 리로드) 시 콘솔 경고 |
| **원인 1** | React Strict Mode가 개발 환경에서 컴포넌트를 두 번 실행하여 `createBrowserClient()`가 두 번 호출됨 |
| **원인 2** | 모듈 레벨 변수는 HMR로 인해 초기화가 반복될 수 있음 |
| **해결 방법 1** | `globalThis.__supabaseBrowserClient` 싱글턴 패턴 적용 |
| **해결 방법 2** | `next.config.ts`에 `reactStrictMode: false` 설정 |
| **해결 여부** | ✅ 해결 |
| **남은 문제** | Strict Mode 비활성화가 일부 버그를 개발 단계에서 놓칠 수 있음 |

---

## ERR-003 · Vercel 첫 배포 실패 — 환경변수 누락

| 항목 | 내용 |
|------|------|
| **오류 메시지** | 빌드 로그: "Collecting page data using 1 worker..." 이후 실패 |
| **발생 상황** | GitHub 저장소를 Vercel에 연결 후 첫 자동 배포 |
| **원인** | `.env.local` 파일이 `.gitignore`에 포함되어 GitHub에 올라가지 않음. Vercel 배포 환경에 환경변수가 없어 Supabase 초기화 실패 |
| **해결 방법** | Vercel 대시보드 → Environment Variables에 3개 변수 수동 추가 후 재배포 |
| **해결 여부** | ✅ 해결 |
| **남은 문제** | 없음. 단, 새 환경변수 추가 시 항상 재배포 필요 |

**필요 환경변수:**
```
ANTHROPIC_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## ERR-004 · Vercel 배포 브랜치 오류 — main 브랜치에 최신 코드 없음

| 항목 | 내용 |
|------|------|
| **오류 메시지** | 배포는 성공하지만 기능이 없는 구버전 앱 표시 |
| **발생 상황** | Vercel이 `main` 브랜치를 배포하는데, 개발 작업이 `feature/pattern-remix-sharing-pdf` 브랜치에서 진행됨 |
| **원인** | Vercel 기본 배포 대상은 `main`인데 모든 코드가 feature 브랜치에만 존재 |
| **해결 방법** | `git merge feature/... → main` 후 `git push origin main` |
| **해결 여부** | ✅ 해결 |
| **남은 문제** | 없음. 현재 `main` = 최신 상태 |

---

## ERR-005 · Supabase `upsert` 이메일 업데이트 안 됨

| 항목 | 내용 |
|------|------|
| **오류 메시지** | 오류 없음, 하지만 이메일 검색 기능이 동작하지 않음 |
| **발생 상황** | 이웃 이메일 검색 기능 추가 후 `user_profiles.email` 컬럼이 항상 NULL |
| **원인 1** | `user_profiles` 테이블에 `email` 컬럼 자체가 없었음 |
| **원인 2** | `upsert`에 `ignoreDuplicates: true` 옵션이 있어 기존 행 업데이트가 무시됨 |
| **해결 방법 1** | Supabase SQL Editor에서 `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email text;` 실행 |
| **해결 방법 2** | `upsert` 호출에서 `ignoreDuplicates: true` 제거 |
| **해결 여부** | ✅ 해결 |
| **남은 문제** | 기존 가입 사용자의 email 컬럼은 NULL로 남아 있음. 재로그인 시 자동으로 채워짐 |

---

## ERR-006 · 카카오톡 인앱 브라우저 Google OAuth 차단

| 항목 | 내용 |
|------|------|
| **오류 메시지** | `403 오류: disallowed_useragent` / "bank의 요청이 Google 정책을 준수하지 않습니다" |
| **발생 상황** | 카카오톡 채팅에서 링크를 탭하여 접속 후 구글 로그인 시도 |
| **원인** | Google이 WebView/인앱 브라우저에서의 OAuth 인증을 보안 정책상 차단. 2021년부터 적용된 정책 |
| **해결 방법** | `ClientShell.tsx`에 User-Agent 기반 인앱 브라우저 감지 로직 추가. 감지 시 외부 브라우저 유도 화면 표시 |
| **해결 여부** | ✅ 해결 (감지 화면 표시는 동작, 구글 로그인 자체 제한은 Google 정책이라 코드로 해결 불가) |
| **남은 문제** | 카카오톡 외 다른 인앱 브라우저도 동일한 문제 가능. User-Agent 목록 지속 관리 필요 |

**감지 대상 앱:**
- 카카오톡 (`KAKAOTALK`)
- 네이버 (`NAVER`)
- 인스타그램 (`Instagram`)
- 페이스북 (`FBAN`, `FBAV`)
- 라인 (`Line/`)
- 위챗 (`MicroMessenger`)
- 스냅챗 (`Snapchat`)

---

## ERR-007 · Vercel 함수 타임아웃 — JSON 파싱 오류

| 항목 | 내용 |
|------|------|
| **오류 메시지** | `Unexpected token 'A', "An error o"... is not valid JSON` (alert 팝업) |
| **발생 상황** | 시험지 5장 이상 업로드 후 "구조화 + 패턴 추출" 버튼 클릭 |
| **원인 1** | Vercel Hobby 플랜의 serverless 함수 실행 시간 상한 = 60초 |
| **원인 2** | 5장 이상의 OCR 텍스트를 Claude에 단일 호출 시 60초 초과 |
| **원인 3** | Vercel이 타임아웃 시 JSON이 아닌 plain text 에러를 반환하는데, 클라이언트가 `res.json()`으로 파싱 시도하여 파싱 오류 발생 |
| **원인 4** | `/api/source-passages/analyze`에 `maxDuration` 미설정 → 기본값 10초 |
| **시도한 해결 방법 1** | `analyze-all/route.ts`의 `maxDuration`을 120 → 60으로 수정 (Hobby 상한에 맞춤) |
| **시도한 해결 방법 2** | `source-passages/analyze/route.ts`에 `maxDuration = 60` 추가 |
| **시도한 해결 방법 3** | 클라이언트에서 `res.text()` → `JSON.parse()` 순서로 변경, 파싱 실패 시 한국어 안내 메시지 표시 |
| **해결 여부** | ⚠️ 부분 해결 — 에러 메시지는 개선됨. 근본 원인(타임아웃 자체)은 미해결 |
| **남은 문제** | 5장 이상 시험지는 여전히 60초 초과 가능. 페이지를 3~4장씩 나눠 올려야 함 |

**근본 해결 방안 (미구현):**
1. Vercel Pro 업그레이드 (함수 실행 300초)
2. 페이지 단위 chunk 처리 (1~2장씩 분석 후 결과 합산)
3. Background job 방식 (즉시 job ID 반환 → 클라이언트 폴링)

---

## ERR-008 · `zsh: no matches found` — git add 브래킷 오류

| 항목 | 내용 |
|------|------|
| **오류 메시지** | `zsh: no matches found: src/app/api/neighbors/[id]/route.ts` |
| **발생 상황** | 터미널에서 `git add src/app/api/neighbors/[id]/route.ts` 실행 시 |
| **원인** | zsh에서 `[]`를 glob 패턴으로 해석하여 파일을 찾지 못함 |
| **해결 방법** | 경로를 따옴표로 감쌈: `git add "src/app/api/neighbors/[id]/route.ts"` |
| **해결 여부** | ✅ 해결 |
| **남은 문제** | 없음 (동적 라우트 파일 git add 시 항상 따옴표 필요) |

---

## ERR-009 · Supabase SQL 정책 이미 존재 오류

| 항목 | 내용 |
|------|------|
| **오류 메시지** | `ERROR: 42710: policy "..." already exists for table "..."` |
| **발생 상황** | Supabase SQL Editor에서 전체 스키마 SQL 재실행 시 |
| **원인** | 이미 생성된 RLS 정책을 다시 CREATE하려 해서 충돌 |
| **해결 방법** | `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` 구문만 별도로 실행 |
| **해결 여부** | ✅ 해결 |
| **남은 문제** | 없음. 향후 스키마 변경 시 새로 추가하는 부분만 선택 실행 필요 |

---

## 현재 미해결 문제 요약

| # | 문제 | 심각도 | 비고 |
|---|------|--------|------|
| ERR-007 | Vercel 60초 타임아웃 (5장 이상) | 🔴 높음 | 페이지 수 제한으로 우회 중 |
| — | `maxDuration = 300` 설정이 Hobby에서 무시됨 | 🟡 중간 | `/api/pattern-remix/generate`에 300초 설정 잔존 |
| — | 레거시 API 미정리 | 🟡 중간 | `/api/analyze`, `/api/generate`, `/api/structure`, `AppContext.tsx` |
| — | 토큰 비용 모니터링 없음 | 🟡 중간 | Anthropic API 사용량 추적 불가 |
| — | 기존 사용자 email NULL | 🟢 낮음 | 재로그인 시 자동 채워짐 |
