# 客人發訂單訊息 → 商家自動回覆「點餐完畢」Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 客人在 LIFF 下單成功後從 LINE@ 聊天室發出含訂單編號的訊息，後端 webhook 驗證後以 Messaging API reply 回覆「點餐完畢」。

**Architecture:** 純函式工具集中於 `lib/lineMessaging.ts`（簽章驗證、編號解析、訊息組裝、reply 呼叫、時間格式化），由新的 `app/api/line/webhook/route.ts` 串接 DB 查詢與回覆。前端 `lib/liff.ts` 新增 `sendOrderMessage`，於 `CheckoutFlow.submit()` 成功後觸發。

**Tech Stack:** Next.js 15 App Router（route handler, `runtime="nodejs"`）、Prisma、`@line/liff`、Vitest、Node `crypto`。

## Global Constraints

- 不信任前端：訂單編號來自客人訊息 → 後端必以編號查 DB 確認後，用 DB 真實資料組回覆。
- secrets（`LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`、`LINE_MESSAGING_CHANNEL_SECRET`）僅後端、不進前端、不寫死、不 commit。
- 只用 reply（免費），不用 push；不推狀態變更；不處理訂單訊息以外的 webhook 事件。
- 發訊息 / 回覆失敗不可影響下單主流程。
- 訂單編號格式：`YYYYMMDD-NNNN`（對應 `Order.orderNumber`，`@unique`）。
- 既有測試風格：Vitest，`vi.stubGlobal("fetch", ...)`，檔案放在被測模組旁 `*.test.ts`。
- commit 作者已設定為 `Chris <chihweichang69@gmail.com>`（本 repo local config）。

---

### Task 1: 簽章驗證 `verifyLineSignature`

**Files:**
- Create: `lib/lineMessaging.ts`
- Test: `lib/lineMessaging.test.ts`

**Interfaces:**
- Produces: `verifyLineSignature(rawBody: string, signature: string | null, channelSecret: string): boolean`

- [ ] **Step 1: 寫失敗測試**

```ts
// lib/lineMessaging.test.ts
import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyLineSignature } from "./lineMessaging";

const SECRET = "test-channel-secret";
function sign(body: string, secret = SECRET): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64");
}

describe("verifyLineSignature", () => {
  it("accepts a correct signature", () => {
    const body = '{"events":[]}';
    expect(verifyLineSignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const body = '{"events":[]}';
    expect(verifyLineSignature(body + "x", sign(body), SECRET)).toBe(false);
  });

  it("rejects a null signature", () => {
    expect(verifyLineSignature("{}", null, SECRET)).toBe(false);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run lib/lineMessaging.test.ts`
Expected: FAIL（`verifyLineSignature` 尚未定義 / 模組不存在）

- [ ] **Step 3: 最小實作**

```ts
// lib/lineMessaging.ts
/**
 * LINE Messaging API 伺服器端工具（webhook 驗簽章、解析訂單編號、組回覆、呼叫 reply）。
 * 僅後端使用；secrets 來自環境變數。
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
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run lib/lineMessaging.test.ts`
Expected: PASS（3 tests）

- [ ] **Step 5: Commit**

```bash
git add lib/lineMessaging.ts lib/lineMessaging.test.ts
git commit -m "feat: add verifyLineSignature for LINE webhook"
```

---

### Task 2: 解析訂單編號 `parseOrderNumber`

**Files:**
- Modify: `lib/lineMessaging.ts`
- Test: `lib/lineMessaging.test.ts`

**Interfaces:**
- Produces: `parseOrderNumber(text: string): string | null`

- [ ] **Step 1: 追加失敗測試**

```ts
// 追加到 lib/lineMessaging.test.ts
import { parseOrderNumber } from "./lineMessaging";

describe("parseOrderNumber", () => {
  it("extracts a YYYYMMDD-NNNN order number from text", () => {
    expect(parseOrderNumber("我已送出訂單\n訂單編號：20260627-0002")).toBe(
      "20260627-0002",
    );
  });

  it("returns null when no order number present", () => {
    expect(parseOrderNumber("你好，請問營業時間")).toBeNull();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run lib/lineMessaging.test.ts -t parseOrderNumber`
Expected: FAIL（`parseOrderNumber` 未定義）

- [ ] **Step 3: 最小實作（追加到 lib/lineMessaging.ts）**

```ts
const ORDER_NUMBER_RE = /(\d{8}-\d{4})/;

/** 從訊息文字抓出訂單編號（YYYYMMDD-NNNN），找不到回 null。 */
export function parseOrderNumber(text: string): string | null {
  const m = text.match(ORDER_NUMBER_RE);
  return m ? m[1] : null;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run lib/lineMessaging.test.ts`
Expected: PASS（5 tests 累計）

- [ ] **Step 5: Commit**

```bash
git add lib/lineMessaging.ts lib/lineMessaging.test.ts
git commit -m "feat: add parseOrderNumber"
```

---

### Task 3: 組回覆訊息 `buildConfirmationReply` + 時間格式 `formatPickupLabel`

**Files:**
- Modify: `lib/lineMessaging.ts`
- Test: `lib/lineMessaging.test.ts`

**Interfaces:**
- Produces:
  - `formatPickupLabel(date: Date, timeZone?: string): string`（回傳 `HH:mm`，預設 `Asia/Taipei`）
  - `buildConfirmationReply(input: { orderNumber: string; pickupTimeLabel: string; total: number }): { type: "text"; text: string }`

- [ ] **Step 1: 追加失敗測試**

```ts
// 追加到 lib/lineMessaging.test.ts
import { buildConfirmationReply, formatPickupLabel } from "./lineMessaging";

describe("formatPickupLabel", () => {
  it("formats a Date as HH:mm in Asia/Taipei", () => {
    // 2026-06-27T07:15:00Z = 15:15 台北時間
    expect(formatPickupLabel(new Date("2026-06-27T07:15:00Z"))).toBe("15:15");
  });
});

describe("buildConfirmationReply", () => {
  it("builds a text message with order number, pickup time and total", () => {
    const msg = buildConfirmationReply({
      orderNumber: "20260627-0002",
      pickupTimeLabel: "15:15",
      total: 75,
    });
    expect(msg.type).toBe("text");
    expect(msg.text).toContain("20260627-0002");
    expect(msg.text).toContain("15:15");
    expect(msg.text).toContain("$75");
    expect(msg.text).toContain("點餐完畢");
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run lib/lineMessaging.test.ts -t "formatPickupLabel|buildConfirmationReply"`
Expected: FAIL（兩個函式未定義）

- [ ] **Step 3: 最小實作（追加到 lib/lineMessaging.ts）**

```ts
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
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run lib/lineMessaging.test.ts`
Expected: PASS（7 tests 累計）

- [ ] **Step 5: Commit**

```bash
git add lib/lineMessaging.ts lib/lineMessaging.test.ts
git commit -m "feat: add buildConfirmationReply and formatPickupLabel"
```

---

### Task 4: 呼叫 LINE reply API `replyMessage`

**Files:**
- Modify: `lib/lineMessaging.ts`
- Test: `lib/lineMessaging.test.ts`

**Interfaces:**
- Consumes: `buildConfirmationReply` 的回傳型別（訊息物件）
- Produces: `replyMessage(replyToken: string, messages: object[], accessToken: string): Promise<void>`

- [ ] **Step 1: 追加失敗測試**

```ts
// 追加到 lib/lineMessaging.test.ts
import { afterEach, vi } from "vitest";
import { replyMessage } from "./lineMessaging";

describe("replyMessage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs replyToken + messages with bearer token", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchSpy);

    await replyMessage("RT", [{ type: "text", text: "hi" }], "ACCESS");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.line.me/v2/bot/message/reply");
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe("Bearer ACCESS");
    expect(JSON.parse(init.body)).toEqual({
      replyToken: "RT",
      messages: [{ type: "text", text: "hi" }],
    });
  });
});
```

> 註：`vi` / `afterEach` 若檔案頂部已 import，勿重複 import；保留單一 import 行即可。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run lib/lineMessaging.test.ts -t replyMessage`
Expected: FAIL（`replyMessage` 未定義）

- [ ] **Step 3: 最小實作（追加到 lib/lineMessaging.ts）**

```ts
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
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run lib/lineMessaging.test.ts`
Expected: PASS（8 tests 累計）

- [ ] **Step 5: Commit**

```bash
git add lib/lineMessaging.ts lib/lineMessaging.test.ts
git commit -m "feat: add replyMessage (LINE reply API)"
```

---

### Task 5: Webhook 端點 `POST /api/line/webhook`

**Files:**
- Create: `app/api/line/webhook/route.ts`
- Test: `app/api/line/webhook/route.test.ts`

**Interfaces:**
- Consumes: `verifyLineSignature`, `parseOrderNumber`, `formatPickupLabel`, `buildConfirmationReply`, `replyMessage`（Task 1–4）；`prisma`（`lib/db`）
- Produces: `POST(request: Request): Promise<Response>`

**行為：** 讀原始 body → 未設定 secret/token 視為未啟用回 200 → 驗簽章失敗回 401 → 解析 events → 對 text 訊息抓編號 → 查 DB → reply。其餘一律回 200。

- [ ] **Step 1: 寫失敗測試**

```ts
// app/api/line/webhook/route.test.ts
import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "wh-secret";
const TOKEN = "wh-token";

// 在 import route 前先設好環境變數與 mock
vi.mock("@/lib/db", () => ({
  prisma: { order: { findUnique: vi.fn() } },
}));

import { prisma } from "@/lib/db";
import { POST } from "./route";

function sign(body: string): string {
  return crypto.createHmac("sha256", SECRET).update(body).digest("base64");
}
function req(body: string, signature: string | null): Request {
  return new Request("https://x/api/line/webhook", {
    method: "POST",
    headers: signature ? { "x-line-signature": signature } : {},
    body,
  });
}

describe("POST /api/line/webhook", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    process.env.LINE_MESSAGING_CHANNEL_SECRET = SECRET;
    process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN = TOKEN;
    fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchSpy);
    (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LINE_MESSAGING_CHANNEL_SECRET;
    delete process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  });

  it("replies when a known order message arrives with valid signature", async () => {
    (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      orderNumber: "20260627-0002",
      pickupTime: new Date("2026-06-27T07:15:00Z"),
      total: 75,
    });
    const body = JSON.stringify({
      events: [
        {
          type: "message",
          replyToken: "RT",
          message: { type: "text", text: "訂單編號：20260627-0002" },
        },
      ],
    });
    const res = await POST(req(body, sign(body)));
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const init = fetchSpy.mock.calls[0][1];
    expect(JSON.parse(init.body).replyToken).toBe("RT");
  });

  it("returns 401 on bad signature and does not reply", async () => {
    const body = JSON.stringify({ events: [] });
    const res = await POST(req(body, "wrong"));
    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 200 and no reply for non-order text", async () => {
    const body = JSON.stringify({
      events: [
        { type: "message", replyToken: "RT", message: { type: "text", text: "你好" } },
      ],
    });
    const res = await POST(req(body, sign(body)));
    expect(res.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 200 and no reply when order not found", async () => {
    (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const body = JSON.stringify({
      events: [
        {
          type: "message",
          replyToken: "RT",
          message: { type: "text", text: "訂單編號：20260627-9999" },
        },
      ],
    });
    const res = await POST(req(body, sign(body)));
    expect(res.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run app/api/line/webhook/route.test.ts`
Expected: FAIL（`./route` 不存在）

- [ ] **Step 3: 最小實作**

```ts
// app/api/line/webhook/route.ts
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

export async function POST(request: Request) {
  const secret = process.env.LINE_MESSAGING_CHANNEL_SECRET;
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  const raw = await request.text();

  // 未設定 → 視為未啟用，靜默回 200（不阻塞 LINE）。
  if (!secret || !token) return NextResponse.json({ ok: true });

  if (!verifyLineSignature(raw, request.headers.get("x-line-signature"), secret)) {
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
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run app/api/line/webhook/route.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 5: Commit**

```bash
git add app/api/line/webhook/route.ts app/api/line/webhook/route.test.ts
git commit -m "feat: add LINE webhook that replies to order messages"
```

---

### Task 6: 前端 `sendOrderMessage` + 結帳串接

**Files:**
- Modify: `lib/liff.ts`
- Modify: `components/checkout/CheckoutFlow.tsx`
- Test: `lib/liff.sendOrderMessage.test.ts`

**Interfaces:**
- Produces: `sendOrderMessage(input: { orderNumber: string }): Promise<void>`（`lib/liff.ts`）

> 註：`liff.sendMessages` 只能在真實 LIFF 環境驗證；單元測試只覆蓋「未設定 LIFF → no-op、不丟錯」。

- [ ] **Step 1: 寫失敗測試**

```ts
// lib/liff.sendOrderMessage.test.ts
import { afterEach, describe, expect, it } from "vitest";
import { sendOrderMessage } from "./liff";

describe("sendOrderMessage", () => {
  const original = process.env.NEXT_PUBLIC_LIFF_ID;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_LIFF_ID;
    else process.env.NEXT_PUBLIC_LIFF_ID = original;
  });

  it("no-ops (no throw) when LIFF is not configured", async () => {
    delete process.env.NEXT_PUBLIC_LIFF_ID;
    await expect(sendOrderMessage({ orderNumber: "20260627-0002" })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run lib/liff.sendOrderMessage.test.ts`
Expected: FAIL（`sendOrderMessage` 未定義）

- [ ] **Step 3: 實作（追加到 lib/liff.ts 末端）**

```ts
/**
 * 下單成功後，從聊天室發一則含訂單編號的訊息給 LINE@（觸發 webhook 回覆）。
 * 條件不符（未設定 / 非從聊天室開）時靜默略過；永不丟錯，不可影響下單。
 */
export async function sendOrderMessage(input: {
  orderNumber: string;
}): Promise<void> {
  if (!isLiffConfigured()) return;
  try {
    if (!liff.isApiAvailable("sendMessages")) return;
    await liff.sendMessages([
      {
        type: "text",
        text: `我已送出訂單\n訂單編號：${input.orderNumber}`,
      },
    ]);
  } catch {
    // 非聊天室環境 / 權限不足 / 網路錯誤 → 忽略
  }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run lib/liff.sendOrderMessage.test.ts`
Expected: PASS（1 test）

- [ ] **Step 5: 串接結帳成功流程**

`components/checkout/CheckoutFlow.tsx`：
1. 將 import 由 `import { getIdToken } from "@/lib/liff";` 改為 `import { getIdToken, sendOrderMessage } from "@/lib/liff";`
2. 在 `submit()` 內 `saveDemoOrder(stored);` 之後、`clear();` 之前插入一行：

```ts
      await sendOrderMessage({ orderNumber: order.order_number });
```

（`sendOrderMessage` 內部已吞錯，不需額外 try/catch。）

- [ ] **Step 6: 全測試 + 型別檢查**

Run: `npm test && npx tsc --noEmit`
Expected: 全數 PASS、無型別錯誤

- [ ] **Step 7: Commit**

```bash
git add lib/liff.ts lib/liff.sendOrderMessage.test.ts components/checkout/CheckoutFlow.tsx
git commit -m "feat: send order message from LIFF after checkout"
```

---

### Task 7: 文件與環境變數

**Files:**
- Modify: `.env.example`
- Modify: `docs/LINE_SETUP.md`
- Modify: `docs/DEPLOY.md`

**Interfaces:** 無程式介面。

- [ ] **Step 1: `.env.example` 追加（在 LINE LIFF 區塊後）**

```
# --- LINE Messaging API（訂單自動回覆，POST /api/line/webhook）---
# 與上方 LINE Login channel 不同，這是 Messaging API 官方帳號的憑證。
# 後端用：呼叫 reply API。留空 = 不啟用自動回覆。
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=
# 後端用：驗證 webhook 簽章。
LINE_MESSAGING_CHANNEL_SECRET=
```

- [ ] **Step 2: `docs/LINE_SETUP.md` 追加「Messaging API 訂單自動回覆」一節**

內容需涵蓋：
- 建立 / 使用 Messaging API 官方帳號，取得 channel access token（long-lived）+ channel secret。
- Webhook URL = `https://line-liff-ordering.vercel.app/api/line/webhook`，啟用「使用 webhook」。
- 關閉 LINE 官方帳號的「自動回應訊息」（避免衝突）。
- LIFF app 勾 `chat_message.write` scope。
- 客人開 LIFF 的聊天室 = 此 Messaging API 官方帳號。
- 環境變數 `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` / `LINE_MESSAGING_CHANNEL_SECRET` 設於 Vercel。
- 流程圖：sendMessages → webhook → reply。

- [ ] **Step 3: `docs/DEPLOY.md` 環境變數表追加兩列**

| 變數 | 必填 | 值 | 備註 |
| --- | --- | --- | --- |
| `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` | ⬜ | Messaging API channel access token | 訂單自動回覆；留空＝不啟用 |
| `LINE_MESSAGING_CHANNEL_SECRET` | ⬜ | Messaging API channel secret | webhook 簽章驗證 |

- [ ] **Step 4: Commit**

```bash
git add .env.example docs/LINE_SETUP.md docs/DEPLOY.md
git commit -m "docs: LINE Messaging API webhook setup + env"
```

---

## Self-Review

**Spec coverage：**
- sendMessages 觸發 → Task 6。webhook 驗簽章/解析/查 DB/reply → Task 1–5。回覆內容 → Task 3。環境變數/設定/文件 → Task 7。邊界情況（壞簽章 401、非訂單 200、查無 200、未設定略過、非聊天室 no-op）→ Task 5/6 測試涵蓋。✅
- 安全（驗簽章、查 DB 不信任前端、secrets 僅後端）→ Task 1/5 + Global Constraints。✅

**Placeholder scan：** 無 TBD/TODO；所有 code step 皆含完整程式碼。Task 7 Step 2 為文件大綱（可接受，非程式 placeholder）。

**Type consistency：**
- `verifyLineSignature(rawBody, signature, channelSecret)`、`parseOrderNumber(text)`、`formatPickupLabel(date, timeZone?)`、`buildConfirmationReply({orderNumber,pickupTimeLabel,total})`、`replyMessage(replyToken, messages, accessToken)`、`sendOrderMessage({orderNumber})` — Task 5 的呼叫與 Task 1–4/6 定義一致。✅
- DB 查詢 `prisma.order.findUnique({ where: { orderNumber }, select: { orderNumber, pickupTime, total } })` 對應 schema 欄位（`@unique orderNumber`、`pickupTime`、`total`）。✅
