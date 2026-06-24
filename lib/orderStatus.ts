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
