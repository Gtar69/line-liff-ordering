/**
 * 將 Prisma 資料列（camelCase）轉為 API 回應 DTO（snake_case，對齊 docs/API.md 與 lib/types.ts）。
 */
import type { Category, Menu, MenuItem, OptionGroup, Store } from "@/lib/types";
import type {
  Category as PrismaCategory,
  MenuItem as PrismaMenuItem,
  Option as PrismaOption,
  OptionGroup as PrismaOptionGroup,
  Store as PrismaStore,
} from "@prisma/client";
import type { OrderWithDetails } from "@/lib/orders";

export function toStoreDTO(store: PrismaStore): Store {
  return {
    id: store.id,
    name: store.name,
    address: store.address,
    phone: store.phone,
    is_open: store.isOpen,
    pickup_methods: ["self_pickup"],
  };
}

function toCategoryDTO(c: PrismaCategory): Category {
  return { id: c.id, name: c.name, sort_order: c.sortOrder };
}

type OptionGroupWithOptions = PrismaOptionGroup & { options: PrismaOption[] };
type MenuItemWithGroups = PrismaMenuItem & {
  optionGroups: OptionGroupWithOptions[];
};

function toOptionGroupDTO(g: OptionGroupWithOptions): OptionGroup {
  return {
    id: g.id,
    name: g.name,
    is_required: g.isRequired,
    min_select: g.minSelect,
    max_select: g.maxSelect,
    options: g.options.map((o) => ({
      id: o.id,
      label: o.label,
      price_delta: o.priceDelta,
    })),
  };
}

export function toMenuItemDTO(item: MenuItemWithGroups): MenuItem {
  return {
    id: item.id,
    category_id: item.categoryId,
    name: item.name,
    description: item.description,
    image_url: item.imageUrl,
    price: item.price,
    is_available: item.isAvailable,
    option_groups: item.optionGroups.map(toOptionGroupDTO),
  };
}

export function toMenuDTO(
  categories: PrismaCategory[],
  items: MenuItemWithGroups[],
): Menu {
  return {
    categories: categories.map(toCategoryDTO),
    items: items.map(toMenuItemDTO),
  };
}

/** 訂單建立 / 完成頁回應（對應 docs/API.md POST /api/orders 201）。 */
export function toOrderResponse(order: OrderWithDetails) {
  return {
    id: order.id,
    order_number: order.orderNumber,
    status: order.status,
    store_name: order.store.name,
    pickup_method: order.pickupMethod,
    pickup_time: order.pickupTime.toISOString(),
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
    created_at: order.createdAt.toISOString(),
    payment_note: "請於取餐時到店付款",
  };
}
