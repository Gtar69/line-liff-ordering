import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/auth";
import { adminListInclude, toAdminListItem } from "@/lib/adminOrders";
import { isOrderStatus, type OrderStatusValue } from "@/lib/orderStatus";
import { dayRangeInTz, todayInTz } from "@/lib/time";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  let statuses: OrderStatusValue[];
  if (scope === "kitchen") {
    statuses = ["pending", "preparing"];
  } else {
    statuses = searchParams.getAll("status").filter(isOrderStatus);
  }

  const store = await prisma.store.findFirst();
  const tz = store?.timezone ?? "Asia/Taipei";
  const dateStr = searchParams.get("date") ?? todayInTz(tz);
  const { start, end } = dayRangeInTz(dateStr, tz);

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
