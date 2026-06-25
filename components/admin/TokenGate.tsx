"use client";

import { useState } from "react";

export function TokenGate({
  onSubmit,
  error,
}: {
  onSubmit: (token: string) => void;
  error?: string | null;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-bold">後台登入</h1>
      <p className="text-sm text-neutral-500">
        請輸入管理員 Token（由系統管理者提供）。
      </p>
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onSubmit(value.trim());
        }}
        placeholder="管理員 Token"
        className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-base"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={!value.trim()}
        onClick={() => onSubmit(value.trim())}
        className="h-12 rounded-xl bg-orange-500 font-semibold text-white disabled:opacity-50"
      >
        進入
      </button>
    </div>
  );
}
