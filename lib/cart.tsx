"use client";

/**
 * 購物車狀態（Issue #2 原型，純前端）。
 * - 同商品不同選項組合視為不同 line（以 lineKey 區分）。
 * - 小計為前端估算，僅供 UX；最終金額以伺服器計算為準（見 docs/PRD.md）。
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { CartLine, MenuItem, SelectedOption } from "@/lib/types";

export const MAX_QUANTITY_PER_LINE = 99;

function buildLineKey(itemId: string, optionIds: string[]): string {
  return `${itemId}::${[...optionIds].sort().join(",")}`;
}

/** 一筆 line 的單價（含選項加價） */
export function lineUnitPrice(line: CartLine): number {
  return (
    line.unit_price + line.options.reduce((sum, o) => sum + o.price_delta, 0)
  );
}

/** 一筆 line 的小計 */
export function lineTotal(line: CartLine): number {
  return lineUnitPrice(line) * line.quantity;
}

interface CartContextValue {
  lines: CartLine[];
  totalQuantity: number;
  subtotal: number;
  addItem: (
    item: MenuItem,
    quantity: number,
    options: SelectedOption[],
  ) => void;
  setQuantity: (lineKey: string, quantity: number) => void;
  removeLine: (lineKey: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const addItem = useCallback(
    (item: MenuItem, quantity: number, options: SelectedOption[]) => {
      const qty = Math.max(1, Math.min(MAX_QUANTITY_PER_LINE, quantity));
      const lineKey = buildLineKey(
        item.id,
        options.map((o) => o.option_id),
      );
      setLines((prev) => {
        const existing = prev.find((l) => l.lineKey === lineKey);
        if (existing) {
          return prev.map((l) =>
            l.lineKey === lineKey
              ? {
                  ...l,
                  quantity: Math.min(MAX_QUANTITY_PER_LINE, l.quantity + qty),
                }
              : l,
          );
        }
        const line: CartLine = {
          lineKey,
          item_id: item.id,
          name: item.name,
          unit_price: item.price,
          quantity: qty,
          options,
        };
        return [...prev, line];
      });
    },
    [],
  );

  const setQuantity = useCallback((lineKey: string, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) return prev.filter((l) => l.lineKey !== lineKey);
      const clamped = Math.min(MAX_QUANTITY_PER_LINE, quantity);
      return prev.map((l) =>
        l.lineKey === lineKey ? { ...l, quantity: clamped } : l,
      );
    });
  }, []);

  const removeLine = useCallback((lineKey: string) => {
    setLines((prev) => prev.filter((l) => l.lineKey !== lineKey));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const totalQuantity = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines],
  );
  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + lineTotal(l), 0),
    [lines],
  );

  const value = useMemo(
    () => ({
      lines,
      totalQuantity,
      subtotal,
      addItem,
      setQuantity,
      removeLine,
      clear,
    }),
    [lines, totalQuantity, subtotal, addItem, setQuantity, removeLine, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart 必須在 CartProvider 內使用");
  return ctx;
}
