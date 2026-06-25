/**
 * 用 sessionStorage 把「已建立訂單」的結果從結帳帶到完成頁。
 * Issue #8 起內容來自真實 POST /api/orders 回應（訂單編號由後端產生）。
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
