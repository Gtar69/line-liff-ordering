import { formatCurrency } from "@/lib/format";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">LINE LIFF 點餐系統</h1>
      <p className="text-neutral-600">
        專案骨架已就緒（Issue #1）。客人端點餐流程將於 Issue #2 建立。
      </p>
      <p className="text-sm text-neutral-400">
        範例小工具：{formatCurrency(65)}
      </p>
    </main>
  );
}
