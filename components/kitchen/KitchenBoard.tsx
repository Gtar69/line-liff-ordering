"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { getKitchenOrders } from "@/lib/adminClient";
import type { KitchenTicket } from "@/lib/types";
import { TokenGate } from "@/components/admin/TokenGate";
import { KitchenTicketCard } from "./KitchenTicketCard";

const TOKEN_KEY = "admin_api_token";
const POLL_MS = 12_000;

export function KitchenBoard() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    setToken(
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null,
    );
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) return;
    try {
      const list = await getKitchenOrders(t);
      setTickets(list);
      setError(null);
      setUpdatedAt(new Date().toLocaleTimeString("zh-TW", { hour12: false }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        tokenRef.current = null;
        setToken(null);
        setGateError("Token 無效或已過期，請重新輸入");
        return;
      }
      setError("更新失敗，將自動重試");
    }
  }, []);

  useEffect(() => {
    tokenRef.current = token;
    if (!token) return;
    void load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [token, load]);

  if (!ready) return null;
  if (!token) {
    return (
      <TokenGate
        onSubmit={(t) => {
          localStorage.setItem(TOKEN_KEY, t);
          setGateError(null);
          setToken(t);
        }}
        error={gateError}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">廚房工單</h1>
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          {updatedAt && <span>更新於 {updatedAt}</span>}
          <button
            type="button"
            onClick={() => void load()}
            className="h-9 rounded-lg bg-neutral-100 px-3 font-medium text-neutral-700"
          >
            重新整理
          </button>
        </div>
      </header>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {tickets.length === 0 ? (
        <div className="grid place-items-center py-24 text-center text-xl text-neutral-400">
          目前沒有待製作的訂單
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((t) => (
            <KitchenTicketCard key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  );
}
