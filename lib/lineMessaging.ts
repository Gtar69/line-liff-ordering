/**
 * LINE Messaging API 伺服器端工具（webhook 驗簽章、解析訂單編號、組回覆、呼叫 reply）。
 * 僅後端使用；secrets 來自環境變數，不可進前端。
 */
import crypto from "node:crypto";

/** 驗證 LINE webhook 的 x-line-signature（HMAC-SHA256 base64，timing-safe）。 */
export function verifyLineSignature(
  rawBody: string,
  signature: string | null,
  channelSecret: string,
): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const ORDER_NUMBER_RE = /(\d{8}-\d{4})/;

/** 從訊息文字抓出訂單編號（YYYYMMDD-NNNN），找不到回 null。 */
export function parseOrderNumber(text: string): string | null {
  const m = text.match(ORDER_NUMBER_RE);
  return m ? m[1] : null;
}

/** 將時刻格式化為某時區的 HH:mm（預設台北）。 */
export function formatPickupLabel(date: Date, timeZone = "Asia/Taipei"): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export interface ConfirmationInput {
  orderNumber: string;
  pickupTimeLabel: string;
  total: number;
}

/** 組「點餐完畢」回覆（純函式）。 */
export function buildConfirmationReply(input: ConfirmationInput): {
  type: "text";
  text: string;
} {
  return {
    type: "text",
    text: [
      "✅ 點餐完畢，感謝您的訂購！",
      `訂單編號：${input.orderNumber}`,
      `取餐時間：${input.pickupTimeLabel}`,
      `金額：$${input.total}`,
      "到店請出示編號取餐並付款 🙏",
    ].join("\n"),
  };
}

const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

/** 呼叫 LINE reply API（失敗時丟出，由呼叫端決定是否吞掉）。 */
export async function replyMessage(
  replyToken: string,
  messages: object[],
  accessToken: string,
): Promise<void> {
  await fetch(LINE_REPLY_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
}
