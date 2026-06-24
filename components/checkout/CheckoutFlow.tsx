"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getPickupTimes, getStore } from "@/lib/mock/menuAdapter";
import { lineTotal, useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/format";
import {
  generateDemoOrderNumber,
  saveDemoOrder,
  type DemoOrder,
} from "@/lib/demoOrder";
import type { PickupSlot, Store } from "@/lib/types";

const NOTE_MAX = 200;

export function CheckoutFlow() {
  const router = useRouter();
  const { lines, subtotal, totalQuantity, clear } = useCart();

  const [store, setStore] = useState<Store | null>(null);
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<1 | 2>(1);
  const [pickupTime, setPickupTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    pickup?: string;
    name?: string;
    phone?: string;
  }>({});

  useEffect(() => {
    let active = true;
    void (async () => {
      const [s, sl] = await Promise.all([getStore(), getPickupTimes()]);
      if (!active) return;
      setStore(s);
      setSlots(sl);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const pickupLabel = useMemo(
    () => slots.find((s) => s.value === pickupTime)?.label ?? "",
    [slots, pickupTime],
  );

  if (submitting) return <CenterNote>送出中…</CenterNote>;
  if (loading) return <CenterNote>載入中…</CenterNote>;

  if (lines.length === 0) {
    return (
      <CenterNote>
        <p className="mb-4">購物車是空的</p>
        <button
          type="button"
          onClick={() => router.push("/menu")}
          className="h-11 rounded-xl bg-orange-500 px-6 font-semibold text-white"
        >
          回菜單點餐
        </button>
      </CenterNote>
    );
  }

  const goStep2 = () => {
    if (!pickupTime) {
      setErrors({ pickup: "請選擇取餐時間" });
      return;
    }
    setErrors({});
    setStep(2);
  };

  const submit = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "請填寫訂購人";
    if (!phone.trim()) next.phone = "請填寫手機號碼";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    if (note.length > NOTE_MAX) return;

    const order: DemoOrder = {
      order_number: generateDemoOrderNumber(),
      store_name: store?.name ?? "",
      pickup_method_label: "自取",
      pickup_time_label: pickupLabel,
      customer_name: name.trim(),
      total: subtotal,
      note: note.trim() || null,
      items: lines.map((l) => ({
        name: l.name,
        options: l.options.map((o) => o.label),
        quantity: l.quantity,
        line_total: lineTotal(l),
      })),
    };

    setSubmitting(true);
    saveDemoOrder(order);
    clear();
    router.push("/complete");
  };

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-neutral-100 bg-white p-4">
        <h1 className="text-lg font-bold">訂單資訊</h1>
        <p className="mt-1 text-sm text-neutral-500">
          <Stepb active={step === 1}>Step1. 取餐方式</Stepb>
          <span className="mx-1 text-neutral-300">→</span>
          <Stepb active={step === 2}>Step2. 訂購資訊</Stepb>
        </p>
      </header>

      <main className="flex-1 space-y-4 p-4">
        <p className="text-base font-semibold">{store?.name}</p>

        {step === 1 ? (
          <>
            <SummaryToggle
              open={summaryOpen}
              onToggle={() => setSummaryOpen((v) => !v)}
              count={totalQuantity}
              subtotal={subtotal}
            />
            {summaryOpen && <ItemTable />}

            <Section title="取餐方式">
              <span className="inline-flex h-10 items-center rounded-full border border-orange-500 bg-orange-50 px-4 text-sm font-semibold text-orange-600">
                自取
              </span>
            </Section>

            <Section title="取餐時間">
              <select
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                aria-label="取餐時間"
                className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base"
              >
                <option value="">請選擇取餐時間</option>
                {slots.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {errors.pickup && (
                <p className="mt-1 text-sm text-red-500">{errors.pickup}</p>
              )}
            </Section>
          </>
        ) : (
          <>
            <div className="space-y-1 rounded-xl bg-neutral-50 p-3 text-sm">
              <Row label="取餐方式" value="自取" />
              <Row label="取餐時間" value={pickupLabel} />
              {store?.address && <Row label="店家地址" value={store.address} />}
              {store?.phone && <Row label="店家電話" value={store.phone} />}
            </div>

            <ItemTable />

            <Section title="請填寫訂購資訊">
              <div className="space-y-3">
                <Field label="訂購人" error={errors.name}>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-base"
                    placeholder="您的稱呼"
                  />
                </Field>
                <Field label="手機號碼" error={errors.phone}>
                  <input
                    value={phone}
                    inputMode="tel"
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-base"
                    placeholder="0912345678"
                  />
                </Field>
                <Field label={`備註（最多 ${NOTE_MAX} 字）`}>
                  <textarea
                    value={note}
                    maxLength={NOTE_MAX}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-neutral-300 p-3 text-base"
                    placeholder="例如：不要香菜"
                  />
                  <p className="mt-1 text-right text-xs text-neutral-400">
                    {note.length}/{NOTE_MAX}
                  </p>
                </Field>
              </div>
            </Section>
          </>
        )}
      </main>

      <div className="sticky bottom-0 z-20 flex gap-3 border-t border-neutral-200 bg-white p-3">
        <button
          type="button"
          onClick={() => (step === 1 ? router.push("/menu") : setStep(1))}
          className="h-12 flex-1 rounded-xl bg-neutral-100 font-semibold text-neutral-700"
        >
          上一步
        </button>
        <button
          type="button"
          onClick={() => (step === 1 ? goStep2() : submit())}
          className="h-12 flex-[2] rounded-xl bg-orange-500 font-semibold text-white"
        >
          {step === 1 ? "下一步" : "送出訂單"}
        </button>
      </div>
    </>
  );

  function ItemTable() {
    return (
      <div className="overflow-hidden rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="p-2 text-left font-medium">商品名稱</th>
              <th className="p-2 text-center font-medium">數量</th>
              <th className="p-2 text-right font-medium">金額</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.lineKey} className="border-t border-neutral-100">
                <td className="p-2">
                  <p className="font-medium">{l.name}</p>
                  {l.options.length > 0 && (
                    <p className="text-xs text-neutral-400">
                      {l.options.map((o) => o.label).join("、")}
                    </p>
                  )}
                </td>
                <td className="p-2 text-center">{l.quantity}</td>
                <td className="p-2 text-right">
                  {formatCurrency(lineTotal(l))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200 bg-neutral-50">
              <td className="p-2 font-semibold" colSpan={2}>
                總計 {totalQuantity} 項（估算）
              </td>
              <td className="p-2 text-right font-bold text-orange-600">
                {formatCurrency(subtotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }
}

function CenterNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid flex-1 place-items-center p-8 text-center text-neutral-500">
      <div>{children}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function SummaryToggle({
  open,
  onToggle,
  count,
  subtotal,
}: {
  open: boolean;
  onToggle: () => void;
  count: number;
  subtotal: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-xl border border-neutral-200 p-3 text-sm"
    >
      <span className="font-medium text-neutral-700">
        {open ? "− 商品明細" : "+ 商品明細"}
      </span>
      <span className="text-neutral-500">
        總計 {count} 項 / 共 {formatCurrency(subtotal)}
      </span>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-800">{value}</span>
    </p>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-neutral-600">{label}</span>
      {children}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </label>
  );
}

function Stepb({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className={active ? "font-semibold text-orange-600" : ""}>
      {children}
    </span>
  );
}
