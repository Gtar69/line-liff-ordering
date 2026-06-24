"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { MAX_QUANTITY_PER_LINE, useCart } from "@/lib/cart";
import type { MenuItem, OptionGroup, SelectedOption } from "@/lib/types";

function requiredMin(group: OptionGroup): number {
  return group.is_required ? Math.max(1, group.min_select) : group.min_select;
}

export function ProductModal({
  item,
  onClose,
  onProceedCheckout,
}: {
  item: MenuItem;
  onClose: () => void;
  onProceedCheckout: () => void;
}) {
  const { addItem } = useCart();
  const hasRequired = item.option_groups.some((g) => g.is_required);
  const [phase, setPhase] = useState<"detail" | "options">("detail");
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  const toggleOption = (group: OptionGroup, optionId: string) => {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (group.max_select <= 1) {
        return { ...prev, [group.id]: [optionId] };
      }
      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= group.max_select) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  };

  const unmetGroups = useMemo(
    () =>
      item.option_groups.filter((g) => {
        const count = (selected[g.id] ?? []).length;
        return count < requiredMin(g) || count > g.max_select;
      }),
    [item.option_groups, selected],
  );
  const canProceed = unmetGroups.length === 0;

  const buildSelectedOptions = (): SelectedOption[] => {
    const result: SelectedOption[] = [];
    for (const group of item.option_groups) {
      for (const optId of selected[group.id] ?? []) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) {
          result.push({
            group_id: group.id,
            group_name: group.name,
            option_id: opt.id,
            label: opt.label,
            price_delta: opt.price_delta,
          });
        }
      }
    }
    return result;
  };

  const handleDetailNext = () => {
    if (hasRequired) {
      setPhase("options");
    } else {
      addItem(item, quantity, []);
      onClose();
    }
  };

  const commit = (goCheckout: boolean) => {
    if (!canProceed) return;
    addItem(item, quantity, buildSelectedOptions());
    if (goCheckout) onProceedCheckout();
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="關閉商品"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88vh] max-w-md flex-col rounded-t-2xl bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 p-4">
          <h2 className="text-lg font-bold">
            {phase === "detail" ? item.name : "訂單資訊"}
          </h2>
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
          {phase === "detail" ? (
            <div className="flex flex-col gap-4">
              <div className="grid aspect-video place-items-center rounded-xl bg-neutral-100 text-5xl text-neutral-400">
                <span aria-hidden>🍴</span>
              </div>
              <div>
                <p className="text-lg font-bold">{item.name}</p>
                {item.description && (
                  <p className="mt-1 text-sm text-neutral-500">
                    {item.description}
                  </p>
                )}
                <p className="mt-2 text-lg font-bold text-orange-600">
                  {formatCurrency(item.price)}
                </p>
              </div>
              <QuantityStepper value={quantity} onChange={setQuantity} />
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {item.option_groups.map((group) => (
                <fieldset key={group.id}>
                  <legend className="mb-2 flex items-center gap-2 text-base font-semibold">
                    {group.is_required && (
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-bold text-orange-700">
                        必選
                      </span>
                    )}
                    {group.name}
                    {group.max_select > 1 && (
                      <span className="text-xs font-normal text-neutral-400">
                        最多 {group.max_select} 項
                      </span>
                    )}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((opt) => {
                      const active = (selected[group.id] ?? []).includes(
                        opt.id,
                      );
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleOption(group, opt.id)}
                          className={`h-10 rounded-full border px-4 text-sm transition ${
                            active
                              ? "border-orange-500 bg-orange-500 text-white"
                              : "border-neutral-300 bg-white text-neutral-700"
                          }`}
                        >
                          {opt.label}
                          {opt.price_delta > 0 &&
                            ` +${formatCurrency(opt.price_delta)}`}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <QuantityStepper value={quantity} onChange={setQuantity} />
              {!canProceed && (
                <p className="text-sm text-red-500">請完成必選項目再繼續。</p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-neutral-100 p-4">
          {phase === "detail" ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="h-12 flex-1 rounded-xl bg-neutral-100 font-semibold text-neutral-700"
              >
                回目錄
              </button>
              <button
                type="button"
                onClick={handleDetailNext}
                className="h-12 flex-1 rounded-xl bg-orange-500 font-semibold text-white"
              >
                選好了
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={!canProceed}
                onClick={() => commit(false)}
                className="h-12 flex-1 rounded-xl bg-neutral-100 font-semibold text-neutral-700 disabled:opacity-50"
              >
                繼續選購
              </button>
              <button
                type="button"
                disabled={!canProceed}
                onClick={() => commit(true)}
                className="h-12 flex-1 rounded-xl bg-orange-500 font-semibold text-white disabled:opacity-50"
              >
                下一步
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QuantityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-base font-medium">數量</span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="減少數量"
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          className="grid h-11 w-11 place-items-center rounded-full border border-neutral-300 text-xl disabled:opacity-40"
        >
          −
        </button>
        <span className="w-8 text-center text-lg font-bold">{value}</span>
        <button
          type="button"
          aria-label="增加數量"
          onClick={() => onChange(Math.min(MAX_QUANTITY_PER_LINE, value + 1))}
          disabled={value >= MAX_QUANTITY_PER_LINE}
          className="grid h-11 w-11 place-items-center rounded-full border border-neutral-300 text-xl disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}
