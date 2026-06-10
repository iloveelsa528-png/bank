"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";

const HIDE_NAV_ON = ["/login", "/auth", "/share"];

function detectInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return /KAKAOTALK|NAVER(App)?|Instagram|FBAN|FBAV|Line\/|Twitter|Snapchat|MicroMessenger/i.test(ua);
}

function getAppName(): string {
  if (typeof window === "undefined") return "";
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return "카카오톡";
  if (/NAVER/i.test(ua)) return "네이버";
  if (/Instagram/i.test(ua)) return "인스타그램";
  if (/FBAN|FBAV/i.test(ua)) return "페이스북";
  if (/Line\//i.test(ua)) return "라인";
  return "앱";
}

function InAppBrowserGuide() {
  const appName = getAppName();
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isKakao = /KAKAOTALK/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-4xl">
        🌐
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          브라우저에서 열어주세요
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          {appName} 내부 브라우저에서는 구글 로그인이 제한됩니다.
          <br />
          Chrome 또는 Safari에서 접속해 주세요.
        </p>
      </div>

      {/* 안내 단계 */}
      <div className="w-full max-w-xs bg-gray-50 rounded-2xl p-5 text-left flex flex-col gap-3">
        {isKakao && isAndroid ? (
          <>
            <p className="text-xs font-bold text-gray-700 mb-1">카카오톡에서 여는 방법</p>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <p className="text-sm text-gray-600">화면 오른쪽 위 <strong>⋮</strong> 메뉴 버튼을 누르세요</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <p className="text-sm text-gray-600"><strong>"외부 브라우저로 열기"</strong>를 선택하세요</p>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-bold text-gray-700 mb-1">접속 방법</p>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <p className="text-sm text-gray-600">아래 주소를 복사하세요</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <p className="text-sm text-gray-600">Chrome 또는 Safari 브라우저를 열고 주소창에 붙여넣기 하세요</p>
            </div>
          </>
        )}
      </div>

      {/* 주소 복사 버튼 */}
      <CopyUrlButton />

      <p className="text-xs text-gray-400">
        국어 문제 뱅크 · bank-beta-six.vercel.app
      </p>
    </div>
  );
}

function CopyUrlButton() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={copy}
      className="w-full max-w-xs py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors"
    >
      {copied ? "복사됐습니다!" : "주소 복사하기"}
    </button>
  );
}

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isInApp, setIsInApp] = useState(false);
  const showNav = !HIDE_NAV_ON.some(p => pathname.startsWith(p));

  useEffect(() => {
    setIsInApp(detectInAppBrowser());
  }, []);

  if (isInApp) return <InAppBrowserGuide />;

  return (
    <>
      <div className={showNav ? "pb-16" : ""}>{children}</div>
      {showNav && <BottomNav />}
    </>
  );
}
