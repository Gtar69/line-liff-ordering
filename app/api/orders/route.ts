import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createOrder, orderInclude, orderSchema } from "@/lib/orders";
import { OrderError } from "@/lib/orderError";
import { verifyIdToken } from "@/lib/line";
import { toOrderResponse } from "@/lib/serializers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "請求內容非有效 JSON" } },
      { status: 400 },
    );
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "輸入驗證失敗",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            issue: i.message,
          })),
        },
      },
      { status: 400 },
    );
  }

  const idempotencyKey = request.headers.get("Idempotency-Key");
  const token = bearerToken(request);
  const lineUserId = token ? await verifyIdToken(token) : null;

  try {
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey },
        include: orderInclude,
      });
      if (existing) {
        return NextResponse.json(toOrderResponse(existing), { status: 200 });
      }
    }

    const order = await createOrder(
      prisma,
      parsed.data,
      { lineUserId, idempotencyKey },
      new Date(),
    );
    return NextResponse.json(toOrderResponse(order), { status: 201 });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
        { status: error.status },
      );
    }
    console.error("POST /api/orders failed", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "伺服器錯誤" } },
      { status: 500 },
    );
  }
}
