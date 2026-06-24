/**
 * 訂單建立服務（Issue #5，核心）。
 * 規則對應 docs/API.md / docs/DB_SCHEMA.md：
 * - 伺服器計價，忽略前端價格（只接受 menu_item_id / quantity / option_ids）
 * - 快照保存商品名稱、單價、選項；菜單變更不影響歷史訂單
 * - 唯一訂單編號（YYYYMMDD-序號）含並發重試
 * - 可選身分（匿名允許），冪等性（Idempotency-Key）
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { OrderError } from "@/lib/orderError";
import { isPickupSlotValid, resolveClose, storeDatePrefix } from "@/lib/pickup";

export const MAX_QTY = 99;
export const MAX_ITEMS = 50;

export const orderItemSchema = z.object({
  menu_item_id: z.string().min(1),
  quantity: z.number().int().min(1),
  option_ids: z.array(z.string()).default([]),
});

export const orderSchema = z.object({
  pickup_method: z.literal("self_pickup"),
  pickup_time: z.string().min(1),
  customer_name: z.string().trim().min(1),
  customer_phone: z.string().trim().min(1),
  note: z.string().max(200).nullish(),
  items: z.array(orderItemSchema),
});

export type OrderInput = z.infer<typeof orderSchema>;

export interface CreateOrderContext {
  lineUserId: string | null;
  idempotencyKey: string | null;
}

// --- 純計價邏輯（DB 無關，可單元測試） ---

interface PriceableOption {
  id: string;
  label: string;
  priceDelta: number;
}
interface PriceableGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: PriceableOption[];
}
interface PriceableItem {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  optionGroups: PriceableGroup[];
}

export interface PricedOption {
  group_name: string;
  label: string;
  price_delta: number;
}
export interface PricedItem {
  menu_item_id: string;
  name_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  line_total: number;
  options: PricedOption[];
}

export function priceLine(
  item: PriceableItem,
  quantity: number,
  optionIds: string[],
): PricedItem {
  if (!item.isAvailable) {
    throw new OrderError(
      "ITEM_UNAVAILABLE",
      422,
      `商品「${item.name}」目前不可售`,
    );
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
    throw new OrderError("ORDER_LIMIT_EXCEEDED", 422, `數量需為 1..${MAX_QTY}`);
  }

  const lookup = new Map<
    string,
    { group: PriceableGroup; option: PriceableOption }
  >();
  for (const group of item.optionGroups) {
    for (const option of group.options) {
      lookup.set(option.id, { group, option });
    }
  }

  const perGroup = new Map<string, number>();
  const options: PricedOption[] = [];
  for (const id of optionIds) {
    const found = lookup.get(id);
    if (!found) {
      throw new OrderError("INVALID_OPTION_SELECTION", 422, "選項不屬於此商品");
    }
    perGroup.set(found.group.id, (perGroup.get(found.group.id) ?? 0) + 1);
    options.push({
      group_name: found.group.name,
      label: found.option.label,
      price_delta: found.option.priceDelta,
    });
  }

  for (const group of item.optionGroups) {
    const count = perGroup.get(group.id) ?? 0;
    const min = group.isRequired
      ? Math.max(1, group.minSelect)
      : group.minSelect;
    if (count < min || count > group.maxSelect) {
      throw new OrderError(
        "INVALID_OPTION_SELECTION",
        422,
        `「${group.name}」選擇數量不符規則`,
      );
    }
  }

  const optionsTotal = options.reduce((sum, o) => sum + o.price_delta, 0);
  const lineTotal = (item.price + optionsTotal) * quantity;

  return {
    menu_item_id: item.id,
    name_snapshot: item.name,
    unit_price_snapshot: item.price,
    quantity,
    line_total: lineTotal,
    options,
  };
}

// --- 建立訂單（DB） ---

export const orderInclude = {
  items: { include: { options: true } },
  store: { select: { name: true } },
} satisfies Prisma.OrderInclude;

export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

function isUniqueViolation(error: unknown, needle: string): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return JSON.stringify(error.meta?.target ?? "").includes(needle);
  }
  return false;
}

export async function createOrder(
  prisma: PrismaClient,
  input: OrderInput,
  ctx: CreateOrderContext,
  now: Date = new Date(),
): Promise<OrderWithDetails> {
  if (input.items.length === 0) {
    throw new OrderError("EMPTY_CART", 422, "購物車為空");
  }
  if (input.items.length > MAX_ITEMS) {
    throw new OrderError(
      "ORDER_LIMIT_EXCEEDED",
      422,
      `單筆訂單品項不可超過 ${MAX_ITEMS} 列`,
    );
  }
  for (const it of input.items) {
    if (it.quantity > MAX_QTY) {
      throw new OrderError(
        "ORDER_LIMIT_EXCEEDED",
        422,
        `數量不可超過 ${MAX_QTY}`,
      );
    }
  }

  const store = await prisma.store.findFirst();
  if (!store) {
    throw new OrderError("NOT_FOUND", 404, "store 尚未設定");
  }
  if (!store.isOpen) {
    throw new OrderError("STORE_CLOSED", 422, "店家目前未營業");
  }

  // 載入商品並計價（ITEM_UNAVAILABLE / INVALID_OPTION_SELECTION）
  const ids = [...new Set(input.items.map((i) => i.menu_item_id))];
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: ids }, storeId: store.id },
    include: { optionGroups: { include: { options: true } } },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));
  const priced = input.items.map((it) => {
    const mi = byId.get(it.menu_item_id);
    if (!mi) {
      throw new OrderError("ITEM_UNAVAILABLE", 422, "商品不存在或不可售");
    }
    return priceLine(mi, it.quantity, it.option_ids);
  });

  // 取餐時間（INVALID_PICKUP_TIME）
  const close = resolveClose(store.businessHours);
  const pickup = new Date(input.pickup_time);
  const valid = isPickupSlotValid(pickup, now, {
    leadMinutes: store.pickupLeadMinutes,
    intervalMinutes: store.pickupIntervalMinutes,
    timezone: store.timezone,
    closeHour: close.hour,
    closeMinute: close.minute,
  });
  if (!valid) {
    throw new OrderError("INVALID_PICKUP_TIME", 422, "取餐時間不可選或已過期");
  }

  const subtotal = priced.reduce((sum, p) => sum + p.line_total, 0);
  const total = subtotal;

  const note =
    typeof input.note === "string" && input.note.trim()
      ? input.note.trim()
      : null;

  const prefix = storeDatePrefix(now, store.timezone);

  for (let attempt = 0; attempt < 20; attempt++) {
    const count = await prisma.order.count({
      where: { orderNumber: { startsWith: `${prefix}-` } },
    });
    const seq = String(count + 1 + attempt).padStart(4, "0");
    const orderNumber = `${prefix}-${seq}`;

    try {
      return await prisma.order.create({
        data: {
          storeId: store.id,
          orderNumber,
          status: "pending",
          pickupMethod: "self_pickup",
          pickupTime: pickup,
          customerName: input.customer_name.trim(),
          customerPhone: input.customer_phone.trim(),
          note,
          subtotal,
          total,
          lineUserId: ctx.lineUserId,
          idempotencyKey: ctx.idempotencyKey,
          items: {
            create: priced.map((p) => ({
              menuItemId: p.menu_item_id,
              nameSnapshot: p.name_snapshot,
              unitPriceSnapshot: p.unit_price_snapshot,
              quantity: p.quantity,
              lineTotal: p.line_total,
              options: {
                create: p.options.map((o) => ({
                  groupNameSnapshot: o.group_name,
                  optionLabelSnapshot: o.label,
                  priceDeltaSnapshot: o.price_delta,
                })),
              },
            })),
          },
          statusHistory: {
            create: { fromStatus: null, toStatus: "pending" },
          },
        },
        include: orderInclude,
      });
    } catch (error) {
      if (isUniqueViolation(error, "order_number")) {
        continue; // 編號碰撞，重試下一個序號
      }
      if (ctx.idempotencyKey && isUniqueViolation(error, "idempotency")) {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey: ctx.idempotencyKey },
          include: orderInclude,
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  throw new OrderError("INTERNAL_ERROR", 500, "無法產生唯一訂單編號");
}
