"use client";

import { formatCurrency } from "@/lib/format";
import { lineTotal, useCart } from "@/lib/cart";

export function CartSheet({
  onClose,
  onCheckout,
}: {
  onClose: () => void;
  onCheckout: () => void;
}) {
  const { lines, subtotal, totalQuantity, setQuantity, removeLine } = useCart();

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="關閉購物車"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88vh] max-w-md flex-col rounded-t-2xl bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 p-4">
          <h2 className="text-lg font-bold">購物車（{totalQuantity} 件）</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {lines.length === 0 ? (
            <p className="py-12 text-center text-neutral-400">購物車是空的</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {lines.map((line) => (
                <li key={line.lineKey} className="flex gap-3">
                  <div className="flex-1">
                    <p className="font-medium">{line.name}</p>
                    {line.options.length > 0 && (
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {line.options.map((o) => o.label).join("、")}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-semibold text-orange-600">
                      {formatCurrency(lineTotal(line))}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="減少數量"
                        onClick={() =>
                          setQuantity(line.lineKey, line.quantity - 1)
                        }
                        className="grid h-8 w-8 place-items-center rounded-full border border-neutral-300"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-bold">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="增加數量"
                        onClick={() =>
                          setQuantity(line.lineKey, line.quantity + 1)
                        }
                        className="grid h-8 w-8 place-items-center rounded-full border border-neutral-300"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.lineKey)}
                      className="text-xs text-neutral-400 underline"
                    >
                      移除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-neutral-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-neutral-500">小計（估算）</span>
            <span className="text-lg font-bold">
              {formatCurrency(subtotal)}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-12 flex-1 rounded-xl bg-neutral-100 font-semibold text-neutral-700"
            >
              回菜單
            </button>
            <button
              type="button"
              disabled={lines.length === 0}
              onClick={onCheckout}
              className="h-12 flex-1 rounded-xl bg-orange-500 font-semibold text-white disabled:opacity-50"
            >
              前往結帳
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
