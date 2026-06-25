/**
 * 後台 / 廚房 API client（Issue #9 起）。
 * 帶 Authorization: Bearer <token>；token 由使用者在後台輸入、存 localStorage。
 */
import { ApiError } from "@/lib/apiClient";
import type {
  AdminOrderDetail,
  AdminOrderListItem,
  KitchenTicket,
} from "@/lib/types";

async function adminFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      data?.error?.code ?? "INTERNAL_ERROR",
      data?.error?.message ?? "請求失敗",
      res.status,
    );
  }
  return data as T;
}

export async function getAdminOrders(
  token: string,
  params?: { status?: string; scope?: string },
): Promise<AdminOrderListItem[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.scope) qs.set("scope", params.scope);
  const query = qs.toString();
  const data = await adminFetch<{ orders: AdminOrderListItem[] }>(
    `/api/admin/orders${query ? `?${query}` : ""}`,
    token,
  );
  return data.orders;
}

export async function getKitchenOrders(
  token: string,
): Promise<KitchenTicket[]> {
  const data = await adminFetch<{ orders: KitchenTicket[] }>(
    "/api/admin/orders?scope=kitchen",
    token,
  );
  return data.orders;
}

export function getAdminOrder(
  id: string,
  token: string,
): Promise<AdminOrderDetail> {
  return adminFetch<AdminOrderDetail>(`/api/admin/orders/${id}`, token);
}

export function updateOrderStatus(
  id: string,
  token: string,
  body: { to_status: string; expected_current_status?: string },
): Promise<AdminOrderDetail> {
  return adminFetch<AdminOrderDetail>(`/api/admin/orders/${id}/status`, token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
