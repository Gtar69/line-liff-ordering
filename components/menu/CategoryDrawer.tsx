"use client";

import type { Category } from "@/lib/types";

export function CategoryDrawer({
  open,
  categories,
  activeId,
  onSelect,
  onClose,
}: {
  open: boolean;
  categories: Category[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="關閉分類選單"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-2xl bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">商品分類</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-600"
          >
            ✕
          </button>
        </div>
        <ul className="max-h-[50vh] divide-y divide-neutral-100 overflow-y-auto">
          {categories.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className={`flex h-12 w-full items-center justify-between px-1 text-left text-base ${
                  c.id === activeId
                    ? "font-semibold text-orange-600"
                    : "text-neutral-800"
                }`}
              >
                {c.name}
                {c.id === activeId && <span aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
