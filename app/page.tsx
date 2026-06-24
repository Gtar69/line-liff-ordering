import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">LINE LIFF 點餐系統</h1>
        <p className="mt-2 text-neutral-600">
          純前端購物流程原型（Issue #2）。資料為示意範例，未串接後端。
        </p>
      </div>
      <Link
        href="/menu"
        className="h-12 rounded-xl bg-orange-500 px-8 text-lg font-semibold leading-[3rem] text-white"
      >
        開始點餐
      </Link>
    </main>
  );
}
