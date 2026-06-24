import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  DEFAULT_MAX_SLOTS,
  generatePickupSlots,
  resolveClose,
} from "@/lib/pickup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
