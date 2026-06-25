"use client";

import { formatCurrency, formatStamp } from "@/lib/format";
import {
  STATUS_LABEL,
  nextStatuses,
  type OrderStatusValue,
} from "@/lib/orderStatus";
import type { AdminOrderDetail } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export function OrderDetailPanel({
  detail,
  onClose,
  onChangeStatus,
  busy,
  actionError,
}: {
  detail: AdminOrderDetail;
  onClose: () => void;
  onChangeStatus: (toStatus: OrderStatusValue) => void;
  busy: boolean;
  actionError: string | null;
}) {
  const actions = nextStatuses(detail.status as OrderStatusValue);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="關閉"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[90vh] max-w-2xl flex-col rounded-t-2xl bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{detail.order_number}</h2>
            <StatusBadge status={detail.status} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
          <div className="space-y-1 rounded-xl bg-neutral-50 p-3">
            <Row label="客人" value={detail.customer_name} />
            <Row label="電話" value={detail.customer_phone} />
            <Row label="取餐方式" value="自取" />
            <Row label="取餐時間" value={formatStamp(detail.pickup_time)} />
            <Row label="建立時間" value={formatStamp(detail.created_at)} />
          </div>

          <div>
            <h3 className="mb-2 font-semibold">商品</h3>
            <ul className="space-y-2">
              {detail.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>
                    {it.name}
                    {it.options.length > 0 && (
                      <span className="text-neutral-400">
                        （{it.options.map((o) => o.label).join("、")}）
                      </span>
                    )}
                    <span className="text-neutral-400"> ×{it.quantity}</span>
                  </span>
                  <span>{formatCurrency(it.line_total)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t border-neutral-100 pt-2 font-semibold">
              <span>總金額</span>
              <span className="text-orange-600">
                {formatCurrency(detail.total)}
              </span>
            </div>
          </div>

          {detail.note && (
            <div>
              <h3 className="mb-1 font-semibold">備註</h3>
              <p className="rounded-lg bg-yellow-50 p-2 text-neutral-700">
                {detail.note}
              </p>
            </div>
          )}

          <div>
            <h3 className="mb-1 font-semibold">狀態歷史</h3>
            <ul className="space-y-1 text-xs text-neutral-500">
              {detail.status_history.map((h, i) => (
                <li key={i}>
                  {formatStamp(h.changed_at)}
                  {h.from_status
                    ? `${STATUS_LABEL[h.from_status as OrderStatusValue] ?? h.from_status} → `
                    : ""}
                  {STATUS_LABEL[h.to_status as OrderStatusValue] ?? h.to_status}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-2 border-t border-neutral-100 p-4">
          {actionError && <p className="text-sm text-red-600">{actionError}</p>}
          {actions.length === 0 ? (
            <p className="text-center text-sm text-neutral-400">
              此訂單已是最終狀態
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {actions.map((s) => {
                const cancel = s === "cancelled";
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(`確定將訂單改為「${STATUS_LABEL[s]}」？`)
                      ) {
                        onChangeStatus(s);
                      }
                    }}
                    className={`h-11 flex-1 rounded-xl px-4 font-semibold disabled:opacity-50 ${
                      cancel
                        ? "bg-red-100 text-red-700"
                        : "bg-orange-500 text-white"
                    }`}
                  >
                    {cancel ? "取消訂單" : `改為「${STATUS_LABEL[s]}」`}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
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
