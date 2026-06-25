import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/auth";
import {
  adminListInclude,
  kitchenInclude,
  toAdminListItem,
  toKitchenTicket,
} from "@/lib/adminOrders";
import { isOrderStatus } from "@/lib/orderStatus";
import { dayRangeInTz, todayInTz } from "@/lib/time";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  const store = await prisma.store.findFirst();
  const tz = store?.timezone ?? "Asia/Taipei";
  const dateStr = searchParams.get("date") ?? todayInTz(tz);
  const { start, end } = dayRangeInTz(dateStr, tz);

  // 廚房：只看 pending / preparing，回傳含商品/選項/備註、依建立時間由舊到新（FIFO）
  if (scope === "kitchen") {
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        status: { in: ["pending", "preparing"] },
      },
      orderBy: { createdAt: "asc" },
      include: kitchenInclude,
    });
    return NextResponse.json({ orders: orders.map(toKitchenTicket) });
  }

  const statuses = searchParams.getAll("status").filter(isOrderStatus);
  const where: Prisma.OrderWhereInput = {
    createdAt: { gte: start, lt: end },
  };
  if (statuses.length > 0) {
    where.status = { in: statuses };
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: adminListInclude,
  });

  return NextResponse.json({ orders: orders.map(toAdminListItem) });
}
