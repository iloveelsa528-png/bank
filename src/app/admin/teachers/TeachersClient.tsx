"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface User {
  id: string;
  username: string;
  role: string;
  created_at: string;
}

interface Props {
  currentUserId: string;
}

export default function TeachersClient({ currentUserId }: Props) {
  const [users, setUsers]       = useState<User[]>([]);
  const [listError, setListError] = useState("");

  // 추가 폼
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [addMsg, setAddMsg]           = useState<{ ok: boolean; text: string } | null>(null);
  const [addLoading, setAddLoading]   = useState(false);

  // 비번재설정 (열린 행 id)
  const [resetId,       setResetId]       = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetMsg,      setResetMsg]      = useState<{ ok: boolean; text: string } | null>(null);
  const [resetLoading,  setResetLoading]  = useState(false);

  // DB 백업
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg,     setBackupMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  // 목록 불러오기
  const fetchUsers = useCallback(async () => {
    setListError("");
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) { setListError(data.error ?? "목록 조회 실패"); return; }
      setUsers(data.users);
    } catch {
      setListError("서버 오류가 발생했습니다.");
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // 강사 추가
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddMsg(null);
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setAddMsg({ ok: false, text: data.error ?? "추가 실패" }); return; }
      setAddMsg({ ok: true, text: `"${newUsername}" 강사 계정이 생성됐습니다.` });
      setNewUsername("");
      setNewPassword("");
      await fetchUsers();
    } catch {
      setAddMsg({ ok: false, text: "서버 오류가 발생했습니다." });
    } finally {
      setAddLoading(false);
    }
  }

  // 강사 삭제
  async function handleDelete(user: User) {
    if (!window.confirm(`정말 "${user.username}" 계정을 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "삭제 실패"); return; }
      await fetchUsers();
    } catch {
      alert("서버 오류가 발생했습니다.");
    }
  }

  // 비번재설정 열기/닫기
  function openReset(id: string) {
    setResetId(id);
    setResetPassword("");
    setResetMsg(null);
  }
  function closeReset() {
    setResetId(null);
    setResetPassword("");
    setResetMsg(null);
  }

  // 비번재설정 확정
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetId) return;
    setResetMsg(null);
    setResetLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${resetId}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setResetMsg({ ok: false, text: data.error ?? "재설정 실패" }); return; }
      setResetMsg({ ok: true, text: "비밀번호가 재설정됐습니다." });
      setResetPassword("");
      setTimeout(closeReset, 1500);
    } catch {
      setResetMsg({ ok: false, text: "서버 오류가 발생했습니다." });
    } finally {
      setResetLoading(false);
    }
  }

  // DB 백업 다운로드
  async function handleBackup() {
    setBackupLoading(true);
    setBackupMsg(null);
    try {
      const res = await fetch("/api/admin/backup");
      if (!res.ok) {
        const data = await res.json();
        setBackupMsg({ ok: false, text: data.error ?? "백업 실패" });
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "exam-maker-backup.db";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg({ ok: true, text: `다운로드 완료 — ${filename}` });
    } catch {
      setBackupMsg({ ok: false, text: "서버 오류가 발생했습니다." });
    } finally {
      setBackupLoading(false);
    }
  }

  function formatDate(iso: string) {
    return iso.replace("T", " ").slice(0, 16);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900">강사 관리</h1>
        <Link
          href="/admin/usage"
          className="ml-auto text-xs text-green-600 hover:text-green-700 font-medium"
        >
          사용량 보기 →
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-5 space-y-5">

        {/* 강사 추가 카드 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">강사 계정 추가</h2>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="아이디"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              required
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="password"
              placeholder="비밀번호 (6자 이상)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="submit"
              disabled={addLoading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400
                         text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
            >
              {addLoading ? "추가 중…" : "추가"}
            </button>
          </form>
          {addMsg && (
            <p className={`mt-2 text-xs rounded-lg px-3 py-2 ${
              addMsg.ok
                ? "text-green-700 bg-green-50"
                : "text-red-600 bg-red-50"
            }`}>
              {addMsg.text}
            </p>
          )}
        </div>

        {/* 강사 목록 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">계정 목록</h2>
          </div>

          {listError && (
            <p className="px-5 py-4 text-sm text-red-600">{listError}</p>
          )}

          {!listError && users.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-400">계정이 없습니다.</p>
          )}

          {users.length > 0 && (
            <div className="divide-y divide-gray-50">
              {users.map(u => (
                <div key={u.id}>
                  {/* 기본 행 */}
                  <div className="px-5 py-3 flex items-center gap-3">
                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {u.username}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          u.role === "admin"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {u.role === "admin" ? "관리자" : "강사"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(u.created_at)}</p>
                    </div>

                    {/* 액션 */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* 비번재설정 — 모든 계정 가능 */}
                      {resetId !== u.id ? (
                        <button
                          onClick={() => openReset(u.id)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200
                                     text-gray-600 hover:border-green-400 hover:text-green-600 transition-colors"
                        >
                          비번재설정
                        </button>
                      ) : (
                        <button
                          onClick={closeReset}
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200
                                     text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          취소
                        </button>
                      )}

                      {/* 삭제 — admin 계정 및 자기 자신 비활성화 */}
                      {u.role === "admin" || u.id === currentUserId ? (
                        <button
                          disabled
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-100
                                     text-gray-300 cursor-not-allowed"
                          title={u.id === currentUserId ? "자기 자신은 삭제 불가" : "관리자 계정 삭제 불가"}
                        >
                          삭제
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDelete(u)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200
                                     text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 비번재설정 인라인 폼 */}
                  {resetId === u.id && (
                    <div className="px-5 pb-3">
                      <form
                        onSubmit={handleReset}
                        className="flex gap-2 bg-gray-50 rounded-xl p-3"
                      >
                        <input
                          type="password"
                          placeholder="새 비밀번호 (6자 이상)"
                          value={resetPassword}
                          onChange={e => setResetPassword(e.target.value)}
                          required
                          minLength={6}
                          autoFocus
                          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm
                                     text-gray-900 placeholder-gray-400 bg-white
                                     focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <button
                          type="submit"
                          disabled={resetLoading}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700
                                     disabled:bg-green-400 text-white text-xs font-semibold
                                     rounded-lg transition-colors whitespace-nowrap"
                        >
                          {resetLoading ? "저장 중…" : "확인"}
                        </button>
                      </form>
                      {resetMsg && (
                        <p className={`mt-1.5 text-xs rounded-lg px-3 py-1.5 ${
                          resetMsg.ok
                            ? "text-green-700 bg-green-50"
                            : "text-red-600 bg-red-50"
                        }`}>
                          {resetMsg.text}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DB 백업 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">DB 백업</h2>
          <p className="text-xs text-gray-400 mb-3">
            받은 .db 파일을 외장하드나 구글드라이브에 보관하세요.
          </p>
          <button
            onClick={handleBackup}
            disabled={backupLoading}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400
                       text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {backupLoading ? "백업 중…" : "DB 백업 다운로드"}
          </button>
          {backupMsg && (
            <p className={`mt-2 text-xs rounded-lg px-3 py-2 ${
              backupMsg.ok
                ? "text-green-700 bg-green-50"
                : "text-red-600 bg-red-50"
            }`}>
              {backupMsg.text}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
