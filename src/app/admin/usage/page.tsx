import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/session';
import { getDb } from '@/lib/db';
import { calcCostUsd } from '@/lib/jobs/pricing';

// ─── 타입 ─────────────────────────────────────────────────────────────────
interface UsageRow {
  user_id: string;
  username: string;
  job_count: number;
  sonnet_input: number;
  sonnet_output: number;
  haiku_input: number;
  haiku_output: number;
}

interface DisplayRow extends UsageRow {
  cost_usd: number;
}

// ─── 기간 옵션 ───────────────────────────────────────────────────────────
const PERIODS = [
  { value: 'all',        label: '전체' },
  { value: 'this_month', label: '이번 달' },
  { value: 'last_7d',    label: '최근 7일' },
];

function getSinceDate(period: string): string | null {
  const now = new Date();
  if (period === 'this_month') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }
  if (period === 'last_7d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

// ─── 포맷 헬퍼 ───────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString();
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(4)}`;
}

// ─── 페이지 ──────────────────────────────────────────────────────────────
export default async function AdminUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // 인증 · 권한 체크
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/');

  const sp = await searchParams;
  const period = typeof sp.period === 'string' ? sp.period : 'all';
  const sinceDate = getSinceDate(period);

  // DB 직접 조회
  const db = getDb();

  const SQL_BASE = `
    SELECT
      u.id                                                             AS user_id,
      u.username,
      COUNT(DISTINCT ul.job_id)                                        AS job_count,
      COALESCE(SUM(CASE WHEN ul.model = 'claude-sonnet-4-6'
                        THEN ul.input_tokens  ELSE 0 END), 0)         AS sonnet_input,
      COALESCE(SUM(CASE WHEN ul.model = 'claude-sonnet-4-6'
                        THEN ul.output_tokens ELSE 0 END), 0)         AS sonnet_output,
      COALESCE(SUM(CASE WHEN ul.model = 'claude-haiku-4-5-20251001'
                        THEN ul.input_tokens  ELSE 0 END), 0)         AS haiku_input,
      COALESCE(SUM(CASE WHEN ul.model = 'claude-haiku-4-5-20251001'
                        THEN ul.output_tokens ELSE 0 END), 0)         AS haiku_output
    FROM usage_logs ul
    JOIN users u ON ul.user_id = u.id
  `;

  const rawRows = (
    sinceDate
      ? db.prepare(`${SQL_BASE} WHERE ul.created_at >= ? GROUP BY ul.user_id, u.username ORDER BY u.username`).all(sinceDate)
      : db.prepare(`${SQL_BASE} GROUP BY ul.user_id, u.username ORDER BY u.username`).all()
  ) as UsageRow[];

  const rows: DisplayRow[] = rawRows.map(r => ({
    ...r,
    cost_usd:
      calcCostUsd('claude-sonnet-4-6',        r.sonnet_input, r.sonnet_output) +
      calcCostUsd('claude-haiku-4-5-20251001', r.haiku_input,  r.haiku_output),
  }));

  // 합계
  const total = rows.reduce(
    (acc, r) => ({
      job_count:     acc.job_count     + r.job_count,
      sonnet_input:  acc.sonnet_input  + r.sonnet_input,
      sonnet_output: acc.sonnet_output + r.sonnet_output,
      haiku_input:   acc.haiku_input   + r.haiku_input,
      haiku_output:  acc.haiku_output  + r.haiku_output,
      cost_usd:      acc.cost_usd      + r.cost_usd,
    }),
    { job_count: 0, sonnet_input: 0, sonnet_output: 0, haiku_input: 0, haiku_output: 0, cost_usd: 0 },
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900">강사별 API 사용량</h1>
        <span className="ml-auto text-xs text-gray-400">{user.username} (관리자)</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-5 space-y-4">

        {/* 안내 문구 */}
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ※ 아래 비용은 <strong>예상치(estimate)</strong>입니다.
          프롬프트 캐싱·배치 할인 등에 따라 실제 청구액과 다를 수 있습니다. 참고용으로만 활용하세요.
        </p>

        {/* 기간 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 mr-1">기간:</span>
          {PERIODS.map(p => (
            <Link
              key={p.value}
              href={`/admin/usage?period=${p.value}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>

        {/* 표 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">강사</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">작업 수</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    Sonnet 입력
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    Sonnet 출력
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    Haiku 입력
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    Haiku 출력
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">예상 비용</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      해당 기간에 사용 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map(r => (
                    <tr key={r.user_id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.username}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(r.job_count)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(r.sonnet_input)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(r.sonnet_output)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(r.haiku_input)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(r.haiku_output)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {fmtUsd(r.cost_usd)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                    <td className="px-4 py-3 text-gray-700">합계</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(total.job_count)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(total.sonnet_input)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(total.sonnet_output)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(total.haiku_input)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(total.haiku_output)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{fmtUsd(total.cost_usd)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* 단가 참고 */}
        <div className="text-xs text-gray-400 space-y-0.5 px-1">
          <p>단가 기준 (USD / 1M tokens): Sonnet — 입력 $3.00 · 출력 $15.00 ／ Haiku — 입력 $1.00 · 출력 $5.00</p>
          <p>마진 미적용(×1.0). 단가·마진 변경: <code className="bg-gray-100 px-1 rounded">src/lib/jobs/pricing.ts</code></p>
        </div>
      </div>
    </div>
  );
}
