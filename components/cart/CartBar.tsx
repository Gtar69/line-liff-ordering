"use client";

import { formatCurrency } from "@/lib/format";

export function CartBar({
  subtotal,
  count,
  onOpenCart,
  onConfirm,
}: {
  subtotal: number;
  count: number;
  onOpenCart: () => void;
  onConfirm: () => void;
}) {
  const empty = count === 0;
  return (
    <div className="sticky bottom-0 z-20 border-t border-neutral-200 bg-white p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenCart}
          disabled={empty}
          aria-label="查看購物車"
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-neutral-100 text-xl disabled:opacity-50"
        >
          🛒
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-xs font-bold text-white">
              {count}
            </span>
          )}
        </button>
        <div className="flex-1">
          <p className="text-xs text-neutral-500">訂單小計</p>
          <p className="text-lg font-bold">{formatCurrency(subtotal)}</p>
        </div>
        <button
          type="button"
          onClick={onConfirm}
          disabled={empty}
          className="h-12 rounded-xl bg-orange-500 px-6 font-semibold text-white disabled:bg-neutral-300"
        >
          確認訂單
        </button>
      </div>
    </div>
  );
}
