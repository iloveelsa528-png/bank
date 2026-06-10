import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';
const EXAM_IMG = '/Users/jo/Downloads/테스트시험지.png';
const PASSAGE_IMG = '/Users/jo/Downloads/테스트지문.webp';

const browser = await chromium.launch({ args: ['--no-sandbox'], headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', e => errors.push(`[pageerror] ${e.message.slice(0, 120)}`));
page.on('console', m => m.type() === 'error' && errors.push(`[console] ${m.text().slice(0, 120)}`));

async function shot(name) {
  await page.screenshot({ path: `/tmp/t_${name}.png`, fullPage: true });
}

async function waitJob(jobId, maxSec = 180) {
  for (let i = 0; i < maxSec / 3; i++) {
    await page.waitForTimeout(3000);
    const r = await page.request.get(`${BASE}/api/jobs/${jobId}`);
    const { job } = await r.json();
    process.stdout.write(`\r  ${job.status} ${job.completed_chunks}/${job.total_chunks}   `);
    if (job.status === 'completed') return job;
    if (job.status === 'failed' || job.status === 'cancelled') throw new Error(`job ${job.status}: ${job.error}`);
  }
  throw new Error('job timeout');
}

let ok = 0, fail = 0;
function pass(msg) { console.log(`  ✅ ${msg}`); ok++; }
function warn(msg) { console.log(`  ⚠️  ${msg}`); }
function ko(msg)   { console.log(`  ❌ ${msg}`); fail++; }

// ─────────────────────────────────────────────────────────────────────────────
// 1. 홈 페이지
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] 홈');
await page.goto(BASE, { waitUntil: 'networkidle' });
await shot('home');
(await page.$('text=시험지 입력')) ? pass('3단계 워크플로 렌더') : ko('3단계 워크플로 없음');

// ─────────────────────────────────────────────────────────────────────────────
// 2. 기출 시험지 업로드 + 분석
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] 기출 시험지 OCR + 패턴 분석');
await page.goto(`${BASE}/pattern-remix`, { waitUntil: 'networkidle' });
// localStorage 초기화 (새 흐름 테스트)
await page.evaluate(() => { localStorage.removeItem('examJobId'); });
await page.reload({ waitUntil: 'networkidle' });

const fileInput = await page.$('input[type="file"]');
await fileInput.setInputFiles(EXAM_IMG);
await page.waitForTimeout(400);
await shot('exam_uploaded');

const btn = await page.$('button:has-text("AI 분석 시작하기")');
if (!btn) { ko('AI 분석 버튼 없음'); } else {
  await btn.click();
  const jobId = await (async () => {
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(800);
      const id = await page.evaluate(() => localStorage.getItem('examJobId'));
      if (id) return id;
    }
    return null;
  })();
  if (!jobId) { ko('examJobId localStorage 없음'); }
  else {
    pass(`job 생성: ${jobId.slice(0,8)}`);
    try {
      await waitJob(jobId, 180);
      pass('분석 완료');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await shot('exam_result');
      const resultText = await page.textContent('body');
      resultText.includes('패턴') ? pass('패턴 결과 화면') : ko('패턴 결과 없음');
    } catch(e) { ko(`분석 실패: ${e.message}`); }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ExamResultView 자동완성 확인
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] 패턴 저장 폼 자동완성');
const schoolInput = await page.$('input[placeholder*="수완고"]');
if (schoolInput) {
  pass('학교명 입력 필드 존재');
  await schoolInput.fill('테스트고');
  const gradeSelect = await page.$('select');
  if (gradeSelect) { await gradeSelect.selectOption('고2'); pass('학년 선택'); }
} else { warn('학교명 필드 찾기 실패 (아직 결과 안 보임)'); }
await shot('exam_form');

// ─────────────────────────────────────────────────────────────────────────────
// 4. 지문 등록 — 텍스트 직접 입력
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] 지문 등록 (텍스트)');
await page.goto(`${BASE}/source-passages`, { waitUntil: 'networkidle' });
await page.click('button:has-text("텍스트 직접 입력")');
await page.waitForTimeout(200);

const sampleText = `현대 사회에서 정보 기술의 발달은 인간의 의사소통 방식을 근본적으로 변화시켰다. 인터넷과 스마트폰의 보급으로 사람들은 시간과 공간의 제약 없이 정보를 주고받을 수 있게 되었으며, 이는 사회 전반에 걸쳐 광범위한 영향을 미치고 있다. 그러나 이러한 변화는 새로운 사회적 문제를 야기하기도 한다.`;
await page.fill('textarea', sampleText);
await page.waitForTimeout(300);
await shot('passage_text_filled');
pass('텍스트 입력');

// 지문 분석 시작
const analyzeBtn = await page.$('button:has-text("출제 포인트 자동 분석")');
if (!analyzeBtn) { ko('지문 분석 버튼 없음'); }
else {
  await analyzeBtn.click();
  pass('분석 시작');
  await page.waitForTimeout(15000); // 동기 분석 대기
  await shot('passage_analyzed');
  const t = await page.textContent('body');
  t.includes('분석') ? pass('분석 결과 표시') : warn('분석 결과 불명확');
}

// 저장 바 확인
const saveBar = await page.$('button:has-text("지문 저장")');
if (saveBar) {
  pass('저장 바 표시');
  await saveBar.click();
  pass('저장 클릭');
  await page.waitForTimeout(2000);
  await shot('passage_saved');
  const afterSave = await page.textContent('body');
  afterSave.includes('저장') ? pass('저장 완료 메시지') : ko('저장 완료 확인 안 됨');
  // 자동 이동 대기
  await page.waitForTimeout(2000);
  const url = page.url();
  url.includes('generate') ? pass(`자동 이동: ${url}`) : warn(`자동 이동 없음 (현재: ${url})`);
} else {
  ko('저장 바 없음');
  await shot('passage_no_save');
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. 문제 생성 — 지문 목록 로드 확인
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] 문제 생성 페이지 지문 목록');
await page.goto(`${BASE}/pattern-remix/generate`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await shot('generate_step1');
const bodyGen = await page.textContent('body');
bodyGen.includes('패턴') ? pass('패턴 선택 단계 렌더') : ko('패턴 선택 안 보임');

// ─────────────────────────────────────────────────────────────────────────────
// 6. API 상태 확인
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] API 상태');
const apis = ['/api/pattern-sets', '/api/source-passages', '/api/jobs', '/api/pattern-based-questions'];
for (const api of apis) {
  const r = await page.request.get(`${BASE}${api}`);
  r.ok() ? pass(`${api} → ${r.status()}`) : ko(`${api} → ${r.status()}`);
}

const sp = await (await page.request.get(`${BASE}/api/source-passages`)).json();
const ps = await (await page.request.get(`${BASE}/api/pattern-sets`)).json();
console.log(`  DB: 지문 ${sp.passages?.length ?? 0}개, 패턴세트 ${ps.patternSets?.length ?? 0}개`);

// ─────────────────────────────────────────────────────────────────────────────
// 결과
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`결과: ✅ ${ok}  ❌ ${fail}`);
if (errors.filter(e => !e.includes('Hydration')).length) {
  console.log('\n⚠️  에러:');
  errors.filter(e => !e.includes('Hydration')).forEach(e => console.log(' ', e));
}

await browser.close();
