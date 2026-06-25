/**
 * 客人端 API client（Issue #7）。
 * 取代 Issue #2 的 mock adapter：呼叫真實後端 /api/store、/api/menu、/api/pickup-times。
 * 介面與 mock adapter 相同，故 UI 元件不需改動。
 */
import type { Menu, PickupSlot, Store } from "@/lib/types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`GET ${url} 失敗（${res.status}）`);
  }
  return (await res.json()) as T;
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
