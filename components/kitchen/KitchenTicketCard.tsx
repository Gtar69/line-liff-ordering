"use client";

import { formatStamp } from "@/lib/format";
import { STATUS_LABEL, type OrderStatusValue } from "@/lib/orderStatus";
import type { KitchenTicket } from "@/lib/types";

export function KitchenTicketCard({ ticket }: { ticket: KitchenTicket }) {
  const isNew = ticket.status === "pending";
  return (
    <div
      className={`rounded-2xl border-2 p-4 ${
        isNew
          ? "border-orange-400 bg-orange-50"
          : "border-blue-300 bg-blue-50/40"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-extrabold tracking-wide">
          {ticket.order_number}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-base font-bold ${
            isNew ? "bg-orange-500 text-white" : "bg-blue-500 text-white"
          }`}
        >
          {STATUS_LABEL[ticket.status as OrderStatusValue] ?? ticket.status}
        </span>
      </div>
      <p className="mt-1 text-base text-neutral-500">
        取餐 {formatStamp(ticket.pickup_time)}
      </p>

      <ul className="mt-3 space-y-2">
        {ticket.items.map((it, i) => (
          <li key={i} className="border-t border-neutral-200 pt-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xl font-bold">{it.name}</span>
              <span className="text-xl font-extrabold text-orange-600">
                ×{it.quantity}
              </span>
            </div>
            {it.options.length > 0 && (
              <p className="mt-0.5 text-lg font-medium text-neutral-700">
                {it.options.join("、")}
              </p>
            )}
          </li>
        ))}
      </ul>

      {ticket.note && (
        <p className="mt-3 rounded-lg bg-yellow-200 px-3 py-2 text-lg font-semibold text-neutral-800">
          備註：{ticket.note}
        </p>
      )}
    </div>
  );
}
