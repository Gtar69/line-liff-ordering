/**
 * 後台 / 廚房訂單查詢的 Prisma include 與回應 serializer。
 */
import { Prisma } from "@prisma/client";

export const adminListInclude = {
  items: { select: { nameSnapshot: true, quantity: true } },
} satisfies Prisma.OrderInclude;

export const adminDetailInclude = {
  items: { include: { options: true } },
  statusHistory: { orderBy: { changedAt: "asc" } },
} satisfies Prisma.OrderInclude;

export const kitchenInclude = {
  items: { include: { options: true } },
} satisfies Prisma.OrderInclude;

export type KitchenOrder = Prisma.OrderGetPayload<{
  include: typeof kitchenInclude;
}>;

export type AdminListOrder = Prisma.OrderGetPayload<{
  include: typeof adminListInclude;
}>;
export type AdminDetailOrder = Prisma.OrderGetPayload<{
  include: typeof adminDetailInclude;
}>;

export function toAdminListItem(order: AdminListOrder) {
  return {
    id: order.id,
    order_number: order.orderNumber,
    status: order.status,
    created_at: order.createdAt.toISOString(),
    pickup_time: order.pickupTime.toISOString(),
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    total: order.total,
    items_summary: order.items
      .map((i) => `${i.nameSnapshot} x${i.quantity}`)
      .join("、"),
    item_count: order.items.length,
  };
}

export function toKitchenTicket(order: KitchenOrder) {
  return {
    id: order.id,
    order_number: order.orderNumber,
    status: order.status,
    created_at: order.createdAt.toISOString(),
    pickup_time: order.pickupTime.toISOString(),
    note: order.note,
    items: order.items.map((i) => ({
      name: i.nameSnapshot,
      quantity: i.quantity,
      options: i.options.map((o) => o.optionLabelSnapshot),
    })),
  };
}

export function toAdminDetail(order: AdminDetailOrder) {
  return {
    id: order.id,
    order_number: order.orderNumber,
    status: order.status,
    pickup_method: order.pickupMethod,
    pickup_time: order.pickupTime.toISOString(),
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    note: order.note,
    subtotal: order.subtotal,
    total: order.total,
    items: order.items.map((i) => ({
      name: i.nameSnapshot,
      unit_price: i.unitPriceSnapshot,
      quantity: i.quantity,
      line_total: i.lineTotal,
      options: i.options.map((o) => ({
        group_name: o.groupNameSnapshot,
        label: o.optionLabelSnapshot,
        price_delta: o.priceDeltaSnapshot,
      })),
    })),
    status_history: order.statusHistory.map((h) => ({
      from_status: h.fromStatus,
      to_status: h.toStatus,
      changed_at: h.changedAt.toISOString(),
    })),
    created_at: order.createdAt.toISOString(),
    updated_at: order.updatedAt.toISOString(),
  };
}
