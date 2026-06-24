"use client";

import type { MenuItem } from "@/lib/types";
import { ProductCard } from "./ProductCard";

export function ProductGrid({
  items,
  emptyText,
  onSelect,
}: {
  items: MenuItem[];
  emptyText: string;
  onSelect: (item: MenuItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="grid place-items-center py-16 text-center text-neutral-400">
        <p>{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <ProductCard key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  );
}
