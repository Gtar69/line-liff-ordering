/**
 * 客人端 API client（Issue #7）。
 * 取代 Issue #2 的 mock adapter：呼叫真實後端 /api/store、/api/menu、/api/pickup-times。
 * 介面與 mock adapter 相同，故 UI 元件不需改動。
 */
import type { Menu, OrderResponse, PickupSlot, Store } from "@/lib/types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`GET ${url} 失敗（${res.status}）`);
  }
  return (await res.json()) as T;
}

/** API 業務錯誤（帶後端錯誤碼），供 UI 顯示友善訊息。 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export interface CreateOrderPayload {
  pickup_method: "self_pickup";
  pickup_time: string;
  customer_name: string;
  customer_phone: string;
  note?: string | null;
  items: { menu_item_id: string; quantity: number; option_ids: string[] }[];
}

export async function getStore(): Promise<Store> {
  return getJson<Store>("/api/store");
}

export async function getMenu(params?: {
  categoryId?: string;
  q?: string;
}): Promise<Menu> {
  const qs = new URLSearchParams();
  if (params?.categoryId) qs.set("category_id", params.categoryId);
  if (params?.q) qs.set("q", params.q);
  const query = qs.toString();
  return getJson<Menu>(`/api/menu${query ? `?${query}` : ""}`);
}

export async function getPickupTimes(): Promise<PickupSlot[]> {
  const body = await getJson<{ slots: PickupSlot[] }>("/api/pickup-times");
  return body.slots;
}

export async function createOrder(
  payload: CreateOrderPayload,
  idempotencyKey?: string,
): Promise<OrderResponse> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const code = data?.error?.code ?? "INTERNAL_ERROR";
    const message = data?.error?.message ?? "送出失敗，請稍後再試";
    throw new ApiError(code, message, res.status);
  }
  return data as OrderResponse;
}
