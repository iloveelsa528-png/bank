import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/session';

export default async function AdminHubPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900">관리자 메뉴</h1>
        <span className="ml-auto text-xs text-gray-400">{user.username}</span>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-3">
        <Link
          href="/admin/teachers"
          className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100
                     shadow-sm px-5 py-5 hover:border-green-300 hover:shadow-md transition-all group"
        >
          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0
                          group-hover:bg-green-100 transition-colors">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857
                   M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857
                   m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">강사 관리</p>
            <p className="text-xs text-gray-400 mt-0.5">계정 추가 · 삭제 · 비밀번호 재설정</p>
          </div>
          <svg className="w-4 h-4 text-gray-300 group-hover:text-green-400 transition-colors"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          href="/admin/usage"
          className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100
                     shadow-sm px-5 py-5 hover:border-green-300 hover:shadow-md transition-all group"
        >
          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0
                          group-hover:bg-green-100 transition-colors">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0
                   012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2
                   0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">사용량 보기</p>
            <p className="text-xs text-gray-400 mt-0.5">강사별 API 사용량 · 예상 비용</p>
          </div>
          <svg className="w-4 h-4 text-gray-300 group-hover:text-green-400 transition-colors"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
