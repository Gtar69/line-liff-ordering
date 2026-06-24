"use client";

import { formatCurrency } from "@/lib/format";
import type { MenuItem } from "@/lib/types";

export function ProductCard({
  item,
  onSelect,
}: {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
}) {
  const disabled = !item.is_available;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(item)}
      aria-label={`${item.name}${disabled ? "（已售完）" : ""}`}
      className={`flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white text-left transition ${
        disabled ? "cursor-not-allowed opacity-50" : "active:scale-[0.98]"
      }`}
    >
      <div className="relative grid aspect-square place-items-center bg-neutral-100 text-3xl text-neutral-400">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden>🍴</span>
        )}
        {disabled && (
          <span className="absolute inset-0 grid place-items-center bg-white/60 text-sm font-semibold text-neutral-600">
            已售完
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 p-2">
        <span className="line-clamp-2 text-sm font-medium text-neutral-900">
          {item.name}
        </span>
        <span className="text-sm font-bold text-orange-600">
          {formatCurrency(item.price)}
        </span>
      </div>
    </button>
  );
}
