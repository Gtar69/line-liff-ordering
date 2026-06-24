"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMenu, getStore } from "@/lib/mock/menuAdapter";
import { useCart } from "@/lib/cart";
import type { Menu, MenuItem, Store } from "@/lib/types";
import { SearchBar } from "./SearchBar";
import { CategoryTabs } from "./CategoryTabs";
import { CategoryDrawer } from "./CategoryDrawer";
import { ProductGrid } from "./ProductGrid";
import { ProductModal } from "./ProductModal";
import { CartBar } from "@/components/cart/CartBar";
import { CartSheet } from "@/components/cart/CartSheet";

type LoadState = "loading" | "ready" | "error";

export function MenuBrowser() {
  const router = useRouter();
  const { subtotal, totalQuantity } = useCart();

  const [state, setState] = useState<LoadState>("loading");
  const [store, setStore] = useState<Store | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const load = async () => {
    setState("loading");
    try {
      const [s, m] = await Promise.all([getStore(), getMenu()]);
      setStore(s);
      setMenu(m);
      setActiveCategory((prev) => prev ?? m.categories[0]?.id ?? null);
      setState("ready");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmedQuery = query.trim();
  const visibleItems = useMemo(() => {
    if (!menu) return [];
    if (trimmedQuery) {
      const q = trimmedQuery.toLowerCase();
      return menu.items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description ?? "").toLowerCase().includes(q),
      );
    }
    return menu.items.filter((i) => i.category_id === activeCategory);
  }, [menu, trimmedQuery, activeCategory]);

  if (state === "loading") {
    return <CenterNote>菜單載入中…</CenterNote>;
  }
  if (state === "error" || !menu || !store) {
    return (
      <CenterNote>
        <p className="mb-4">菜單載入失敗</p>
        <button
          type="button"
          onClick={() => void load()}
          className="h-11 rounded-xl bg-orange-500 px-6 font-semibold text-white"
        >
          重試
        </button>
      </CenterNote>
    );
  }

  const currentTitle = trimmedQuery
    ? "搜尋結果"
    : (menu.categories.find((c) => c.id === activeCategory)?.name ?? "");

  return (
    <>
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-neutral-100 bg-white p-4">
        <div>
          <h1 className="text-xl font-bold">開始訂購</h1>
          <p className="text-sm text-neutral-500">{store.name}</p>
        </div>
        <SearchBar value={query} onChange={setQuery} />
        {!trimmedQuery && (
          <CategoryTabs
            categories={menu.categories}
            activeId={activeCategory}
            onSelect={setActiveCategory}
            onOpenDrawer={() => setDrawerOpen(true)}
          />
        )}
      </header>

      <main className="flex-1 p-4">
        <h2 className="mb-3 text-base font-semibold text-neutral-700">
          {currentTitle}
        </h2>
        <ProductGrid
          items={visibleItems}
          emptyText={
            trimmedQuery
              ? `找不到符合「${trimmedQuery}」的商品`
              : "此分類目前沒有商品"
          }
          onSelect={setSelectedItem}
        />
      </main>

      <CartBar
        subtotal={subtotal}
        count={totalQuantity}
        onOpenCart={() => setCartOpen(true)}
        onConfirm={() => router.push("/checkout")}
      />

      <CategoryDrawer
        open={drawerOpen}
        categories={menu.categories}
        activeId={activeCategory}
        onSelect={(id) => {
          setActiveCategory(id);
          setDrawerOpen(false);
        }}
        onClose={() => setDrawerOpen(false)}
      />

      {selectedItem && (
        <ProductModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onProceedCheckout={() => {
            setSelectedItem(null);
            router.push("/checkout");
          }}
        />
      )}

      {cartOpen && (
        <CartSheet
          onClose={() => setCartOpen(false)}
          onCheckout={() => {
            setCartOpen(false);
            router.push("/checkout");
          }}
        />
      )}
    </>
  );
}

function CenterNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid flex-1 place-items-center p-8 text-center text-neutral-500">
      <div>{children}</div>
    </div>
  );
}
