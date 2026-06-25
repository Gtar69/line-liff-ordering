/**
 * 訂單狀態機（對應 docs/PRD.md / CLAUDE.md 的允許轉換）。
 */
export const ORDER_STATUSES = [
  "pending",
  "preparing",
  "ready",
  "picked_up",
  "cancelled",
] as const;

export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  pending: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["picked_up", "cancelled"],
  picked_up: [],
  cancelled: [],
};

export function isOrderStatus(value: string): value is OrderStatusValue {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function canTransition(
  from: OrderStatusValue,
  to: OrderStatusValue,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** 某狀態的下一步可選狀態（供後台 UI 列出操作按鈕）。 */
export function nextStatuses(from: OrderStatusValue): OrderStatusValue[] {
  return TRANSITIONS[from] ?? [];
}

export const STATUS_LABEL: Record<OrderStatusValue, string> = {
  pending: "新訂單",
  preparing: "製作中",
  ready: "可取餐",
  picked_up: "已取餐",
  cancelled: "已取消",
};
