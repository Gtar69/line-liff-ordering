import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/auth";
import { adminDetailInclude, toAdminDetail } from "@/lib/adminOrders";
import { canTransition, isOrderStatus } from "@/lib/orderStatus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  to_status: z.string(),
  expected_current_status: z.string().optional(),
});

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();

  const { id } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return err("VALIDATION_ERROR", "請求內容非有效 JSON", 400);
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "輸入驗證失敗", 400);
  }
  const { to_status, expected_current_status } = parsed.data;
  if (!isOrderStatus(to_status)) {
    return err("VALIDATION_ERROR", "to_status 不是合法狀態", 400);
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return err("NOT_FOUND", "訂單不存在", 404);
  }

  // 樂觀鎖：client 帶入的目前狀態若與 DB 不符 → 訂單已被他人變更
  if (expected_current_status && order.status !== expected_current_status) {
    return err("ORDER_CONFLICT", "訂單已被其他使用者變更", 409);
  }
  if (!canTransition(order.status, to_status)) {
    return err("INVALID_STATUS_TRANSITION", "不允許的狀態轉換", 409);
  }

  // compare-and-swap：以「目前狀態」為條件更新，避免讀寫之間被插隊
  const result = await prisma.order.updateMany({
    where: { id, status: order.status },
    data: { status: to_status },
  });
  if (result.count === 0) {
    return err("ORDER_CONFLICT", "訂單已被其他使用者變更", 409);
  }

  await prisma.orderStatusHistory.create({
    data: { orderId: id, fromStatus: order.status, toStatus: to_status },
  });

  const updated = await prisma.order.findUnique({
    where: { id },
    include: adminDetailInclude,
  });
  return NextResponse.json(toAdminDetail(updated!));
}
