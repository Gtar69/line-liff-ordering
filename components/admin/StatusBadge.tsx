import { STATUS_LABEL, type OrderStatusValue } from "@/lib/orderStatus";

const COLORS: Record<OrderStatusValue, string> = {
  pending: "bg-orange-100 text-orange-700",
  preparing: "bg-blue-100 text-blue-700",
  ready: "bg-green-100 text-green-700",
  picked_up: "bg-neutral-200 text-neutral-600",
  cancelled: "bg-red-100 text-red-600",
};

export function StatusBadge({ status }: { status: string }) {
  const key = status as OrderStatusValue;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        COLORS[key] ?? "bg-neutral-100 text-neutral-600"
      }`}
    >
      {STATUS_LABEL[key] ?? status}
    </span>
  );
}
