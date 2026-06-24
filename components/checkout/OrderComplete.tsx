"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { loadDemoOrder, type DemoOrder } from "@/lib/demoOrder";

export function OrderComplete() {
  const router = useRouter();
  const [order, setOrder] = useState<DemoOrder | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setOrder(loadDemoOrder());
    setLoaded(true);
  }, []);

  if (!loaded) {
    return <div className="flex-1 p-8 text-center text-neutral-400">…</div>;
  }

  if (!order) {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center text-neutral-500">
        <div>
          <p className="mb-4">找不到訂單資訊</p>
          <button
            type="button"
            onClick={() => router.push("/menu")}
            className="h-11 rounded-xl bg-orange-500 px-6 font-semibold text-white"
          >
            回菜單
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6">
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-green-100 text-3xl">
          ✓
        </div>
        <h1 className="text-xl font-bold">訂單已送出</h1>
        <p className="text-sm text-neutral-500">請於取餐時到店付款</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-4">
        <p className="text-center text-sm text-neutral-500">訂單編號</p>
        <p className="text-center text-2xl font-bold tracking-wider">
          {order.order_number}
        </p>

        <dl className="mt-4 space-y-2 border-t border-neutral-100 pt-4 text-sm">
          <Row label="店家" value={order.store_name} />
          <Row label="取餐方式" value={order.pickup_method_label} />
          <Row label="取餐時間" value={order.pickup_time_label} />
          <Row label="訂購人" value={order.customer_name} />
        </dl>

        <ul className="mt-4 space-y-2 border-t border-neutral-100 pt-4 text-sm">
          {order.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>
                {it.name}
                {it.options.length > 0 && (
                  <span className="text-neutral-400">
                    （{it.options.join("、")}）
                  </span>
                )}
                <span className="text-neutral-400"> ×{it.quantity}</span>
              </span>
              <span>{formatCurrency(it.line_total)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-between border-t border-neutral-100 pt-4">
          <span className="font-semibold">總金額</span>
          <span className="text-lg font-bold text-orange-600">
            {formatCurrency(order.total)}
          </span>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-neutral-400">
        （原型示範：訂單編號為前端假產生，未實際建立訂單）
      </p>

      <button
        type="button"
        onClick={() => router.push("/menu")}
        className="mt-6 h-12 w-full rounded-xl bg-orange-500 font-semibold text-white"
      >
        再點一單
      </button>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-neutral-800">{value}</dd>
    </div>
  );
}
