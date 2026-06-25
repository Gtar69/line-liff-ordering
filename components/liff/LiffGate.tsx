"use client";

import { useCallback, useEffect, useState } from "react";
import { ensureLogin, initLiff, isLiffConfigured } from "@/lib/liff";

type State = "loading" | "ready" | "error";

/**
 * 在客人端進入前完成 LIFF 初始化。
 * - 未設定 LIFF（開發）→ 直接 ready（匿名）。
 * - 初始化失敗 → 顯示清楚錯誤與重試，不白畫面（對應 UI_FLOW 流程 1）。
 */
export function LiffGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(
    isLiffConfigured() ? "loading" : "ready",
  );

  const run = useCallback(async () => {
    if (!isLiffConfigured()) {
      setState("ready");
      return;
    }
    setState("loading");
    try {
      await initLiff();
      ensureLogin();
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  if (state === "loading") {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center text-neutral-500">
        <p>LINE 載入中…</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center text-neutral-500">
        <div>
          <p className="mb-4">
            LINE 初始化失敗，請重新整理或從 LINE 重新開啟。
          </p>
          <button
            type="button"
            onClick={() => void run()}
            className="h-11 rounded-xl bg-orange-500 px-6 font-semibold text-white"
          >
            重試
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
