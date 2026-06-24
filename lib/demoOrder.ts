/**
 * 原型用的「假訂單」傳遞（Issue #2）。
 * 用 sessionStorage 把結帳結果帶到完成頁。
 * 注意：訂單編號為前端假產生的 demo 值，不保證唯一；真實建立與唯一編號於後端 Issue #5。
 */

export interface DemoOrderItem {
  name: string;
  options: string[];
  quantity: number;
  line_total: number;
}

export interface DemoOrder {
  order_number: string;
  store_name: string;
  pickup_method_label: string;
  pickup_time_label: string;
  customer_name: string;
  total: number;
  items: DemoOrderItem[];
  note: string | null;
}

const KEY = "demo_last_order";

export function generateDemoOrderNumber(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `${y}${m}${d}-${seq}`;
}

export function saveDemoOrder(order: DemoOrder): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(order));
}

export function loadDemoOrder(): DemoOrder | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DemoOrder;
  } catch {
    return null;
  }
}
