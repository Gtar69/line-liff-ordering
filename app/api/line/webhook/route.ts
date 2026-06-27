import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buildConfirmationReply,
  formatPickupLabel,
  parseOrderNumber,
  replyMessage,
  verifyLineSignature,
} from "@/lib/lineMessaging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LineEvent {
  type?: string;
  replyToken?: string;
  message?: { type?: string; text?: string };
}

/**
 * LINE Messaging API webhook：客人從聊天室送出含訂單編號的訊息時，
 * 驗證簽章後查 DB 確認訂單，並以 reply API 回覆「點餐完畢」。
 * 安全：驗 x-line-signature；訂單編號為客人端可控，必以編號查 DB 後用真實資料回覆。
 */
export async function POST(request: Request) {
  const secret = process.env.LINE_MESSAGING_CHANNEL_SECRET;
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  const raw = await request.text();

  // 未設定憑證 → 視為未啟用，靜默回 200（不阻塞 LINE，亦不影響其他功能）。
  if (!secret || !token) return NextResponse.json({ ok: true });

  if (
    !verifyLineSignature(raw, request.headers.get("x-line-signature"), secret)
  ) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let events: LineEvent[] = [];
  try {
    events = (JSON.parse(raw).events as LineEvent[]) ?? [];
  } catch {
    return NextResponse.json({ ok: true });
  }

  for (const event of events) {
    try {
      if (event.type !== "message" || event.message?.type !== "text") continue;
      const orderNumber = parseOrderNumber(event.message.text ?? "");
      if (!orderNumber || !event.replyToken) continue;
      const order = await prisma.order.findUnique({
        where: { orderNumber },
        select: { orderNumber: true, pickupTime: true, total: true },
      });
      if (!order) continue;
      await replyMessage(
        event.replyToken,
        [
          buildConfirmationReply({
            orderNumber: order.orderNumber,
            pickupTimeLabel: formatPickupLabel(order.pickupTime),
            total: order.total,
          }),
        ],
        token,
      );
    } catch {
      // 單一事件錯誤不影響整體；仍回 200 避免 LINE 重送風暴。
    }
  }

  return NextResponse.json({ ok: true });
}
