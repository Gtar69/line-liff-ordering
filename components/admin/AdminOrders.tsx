"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import {
  getAdminOrder,
  getAdminOrders,
  updateOrderStatus,
} from "@/lib/adminClient";
import { formatCurrency, formatStamp } from "@/lib/format";
import {
  ORDER_STATUSES,
  STATUS_LABEL,
  type OrderStatusValue,
} from "@/lib/orderStatus";
import type { AdminOrderDetail, AdminOrderListItem } from "@/lib/types";
import { TokenGate } from "./TokenGate";
import { StatusBadge } from "./StatusBadge";
import { OrderDetailPanel } from "./OrderDetailPanel";

const TOKEN_KEY = "admin_api_token";
type Filter = "all" | OrderStatusValue;

export function AdminOrders() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setToken(
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null,
    );
    setReady(true);
  }, []);

  const handleAuthError = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setDetail(null);
    setGateError("Token 無效或已過期，請重新輸入");
  }, []);

  const loadList = useCallback(
    async (t: string, f: Filter) => {
      setLoading(true);
      setListError(null);
      try {
        const list = await getAdminOrders(
          t,
          f === "all" ? undefined : { status: f },
        );
        setOrders(list);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          handleAuthError();
          return;
        }
        setListError("訂單載入失敗");
      } finally {
        setLoading(false);
      }
    },
    [handleAuthError],
  );

  useEffect(() => {
    if (token) void loadList(token, filter);
  }, [token, filter, loadList]);

  const saveToken = (t: string) => {
    localStorage.setItem(TOKEN_KEY, t);
    setGateError(null);
    setToken(t);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setOrders([]);
    setDetail(null);
  };

  const openDetail = async (id: string) => {
    if (!token) return;
    setActionError(null);
    try {
      setDetail(await getAdminOrder(id, token));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) handleAuthError();
    }
  };

  const changeStatus = async (toStatus: OrderStatusValue) => {
    if (!token || !detail) return;
    setBusy(true);
    setActionError(null);
    try {
      const updated = await updateOrderStatus(detail.id, token, {
        to_status: toStatus,
        expected_current_status: detail.status,
      });
      setDetail(updated);
      await loadList(token, filter);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          handleAuthError();
          return;
        }
        setActionError(e.message);
        try {
          setDetail(await getAdminOrder(detail.id, token));
        } catch {
          // ignore refresh failure
        }
      } else {
        setActionError("更新失敗");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;
  if (!token) return <TokenGate onSubmit={saveToken} error={gateError} />;

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">今日訂單</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => token && loadList(token, filter)}
            className="h-9 rounded-lg bg-neutral-100 px-3 text-sm font-medium"
          >
            重新整理
          </button>
          <button
            type="button"
            onClick={logout}
            className="h-9 rounded-lg bg-neutral-100 px-3 text-sm font-medium text-neutral-500"
          >
            登出
          </button>
        </div>
      </header>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {(["all", ...ORDER_STATUSES] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`h-8 shrink-0 rounded-full px-3 text-sm ${
              filter === f
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {f === "all" ? "全部" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <Note>載入中…</Note>
      ) : listError ? (
        <Note>
          {listError}
          <button
            type="button"
            onClick={() => token && loadList(token, filter)}
            className="ml-2 underline"
          >
            重試
          </button>
        </Note>
      ) : orders.length === 0 ? (
        <Note>今日尚無訂單</Note>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => openDetail(o.id)}
                className={`w-full rounded-xl border p-3 text-left ${
                  o.status === "pending"
                    ? "border-orange-300 bg-orange-50"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{o.order_number}</span>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-1 flex items-center justify-between text-sm text-neutral-500">
                  <span>
                    {o.customer_name}・取餐 {formatStamp(o.pickup_time)}
                  </span>
                  <span className="font-semibold text-neutral-800">
                    {formatCurrency(o.total)}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-neutral-400">
                  {o.items_summary}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {detail && (
        <OrderDetailPanel
          detail={detail}
          onClose={() => setDetail(null)}
          onChangeStatus={changeStatus}
          busy={busy}
          actionError={actionError}
        />
      )}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid place-items-center py-16 text-center text-neutral-400">
      <p>{children}</p>
    </div>
  );
}
