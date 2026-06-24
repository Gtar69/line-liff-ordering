/**
 * Mock 菜單資料來源（Issue #2 原型用）。
 * 介面刻意對齊 docs/API.md（GET /api/store、/api/menu、/api/pickup-times），
 * Issue #7 時只需把此檔換成真實 API client，UI 不需改動。
 *
 * 注意：此處資料為示意範例，最終菜單/時段以商家設定與伺服器為準。
 */
import raw from "@/data/menu.mock.json";
import type { Menu, PickupSlot, Store } from "@/lib/types";

const data = raw as unknown as { store: Store; menu: Menu };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** 模擬網路延遲，讓原型能呈現載入狀態 */
function delay(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getStore(): Promise<Store> {
  await delay();
  return clone(data.store);
}

export async function getMenu(params?: {
  categoryId?: string;
  q?: string;
}): Promise<Menu> {
  await delay();
  let items = data.menu.items;

  const q = params?.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q),
    );
  } else if (params?.categoryId) {
    items = items.filter((i) => i.category_id === params.categoryId);
  }

  return { categories: clone(data.menu.categories), items: clone(items) };
}

/**
 * 產生取餐時段（mock）：最早 = 現在 + lead 15 分、每 15 分一格、僅當天。
 * 真實規則於後端 GET /api/pickup-times 實作（Issue #4）。
 */
export async function getPickupTimes(
  now: Date = new Date(),
): Promise<PickupSlot[]> {
  await delay();
  const LEAD_MIN = 15;
  const INTERVAL_MIN = 15;
  const MAX_SLOTS = 16;

  const earliest = new Date(now.getTime() + LEAD_MIN * 60_000);
  // 對齊到下一個 15 分格
  const remainder = earliest.getMinutes() % INTERVAL_MIN;
  if (remainder !== 0 || earliest.getSeconds() > 0) {
    earliest.setMinutes(earliest.getMinutes() + (INTERVAL_MIN - remainder));
  }
  earliest.setSeconds(0, 0);

  const slots: PickupSlot[] = [];
  const cursor = new Date(earliest);
  const today = now.getDate();
  while (slots.length < MAX_SLOTS && cursor.getDate() === today) {
    slots.push({ value: cursor.toISOString(), label: formatSlotLabel(cursor) });
    cursor.setMinutes(cursor.getMinutes() + INTERVAL_MIN);
  }
  return slots;
}

function formatSlotLabel(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `今天 ${mm}-${dd} ${hh}:${mi}`;
}
