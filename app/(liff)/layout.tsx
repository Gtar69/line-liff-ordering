import { CartProvider } from "@/lib/cart";

/**
 * 客人端 LIFF 區段 layout：行動優先容器 + 購物車狀態。
 * 註：此處不重建 LINE 瀏覽器外框，只實作 LIFF 頁面內容（見 docs/UI_FLOW.md）。
 */
export default function LiffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white shadow-sm">
        {children}
      </div>
    </CartProvider>
  );
}
