"use client";

import type { Category } from "@/lib/types";

export function CategoryTabs({
  categories,
  activeId,
  onSelect,
  onOpenDrawer,
}: {
  categories: Category[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenDrawer: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => {
          const active = c.id === activeId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={`h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${
                active
                  ? "bg-orange-500 text-white"
                  : "bg-neutral-100 text-neutral-700"
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="開啟商品分類選單"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-700"
      >
        ☰
      </button>
    </div>
  );
}
