import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/auth";
import { adminDetailInclude, toAdminDetail } from "@/lib/adminOrders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: adminDetailInclude,
  });
  if (!order) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "訂單不存在" } },
      { status: 404 },
    );
  }
  return NextResponse.json(toAdminDetail(order));
}
