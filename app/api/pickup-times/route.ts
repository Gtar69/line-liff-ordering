import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  DEFAULT_CLOSE_HOUR,
  DEFAULT_CLOSE_MINUTE,
  DEFAULT_MAX_SLOTS,
  generatePickupSlots,
} from "@/lib/pickup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 由 store.businessHours 解析當天營業結束時間（{ "close": "HH:mm" }），否則用預設。 */
function resolveClose(businessHours: unknown): {
  hour: number;
  minute: number;
} {
  if (
    businessHours &&
    typeof businessHours === "object" &&
    "close" in businessHours &&
    typeof (businessHours as { close: unknown }).close === "string"
  ) {
    const [h, m] = (businessHours as { close: string }).close
      .split(":")
      .map((v) => Number(v));
    if (Number.isInteger(h) && h >= 0 && h <= 23) {
      return { hour: h, minute: Number.isInteger(m) ? m : 0 };
    }
  }
  return { hour: DEFAULT_CLOSE_HOUR, minute: DEFAULT_CLOSE_MINUTE };
}

export async function GET() {
  const store = await prisma.store.findFirst();
  if (!store || !store.isOpen) {
    return NextResponse.json({ slots: [] });
  }

  const close = resolveClose(store.businessHours);
  const slots = generatePickupSlots(new Date(), {
    leadMinutes: store.pickupLeadMinutes,
    intervalMinutes: store.pickupIntervalMinutes,
    timezone: store.timezone,
    closeHour: close.hour,
    closeMinute: close.minute,
    maxSlots: DEFAULT_MAX_SLOTS,
  });

  return NextResponse.json({ slots });
}
