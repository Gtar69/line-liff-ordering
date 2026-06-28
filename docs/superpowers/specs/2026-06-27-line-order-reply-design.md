# 設計：客人發訂單訊息 → 商家 LINE@ 自動回覆「點餐完畢」

> 日期：2026-06-27
> 狀態：設計定稿（待實作）
> 相關：`docs/LINE_SETUP.md`、`docs/API.md`、`docs/DEPLOY.md`、`CLAUDE.md`

## 目標

客人在 LIFF 下單成功後，從 LINE 官方帳號（LINE@）聊天室發出一則訂單訊息給商家；
商家後端透過 Messaging API **reply**（免費、不佔推播額度）自動回覆客人「點餐完畢 + 訂單編號」。

非目標（維持 MVP，不超建）：

- 不使用 push message（只用 reply）。
- 不推播後續訂單狀態變更。
- 不處理訂單訊息以外的 webhook 事件（不做客服對話 / 其他指令）。
- 不改既有訂單建立邏輯、DB schema。

## 流程

```
客人 LIFF 下單成功（createOrder 回傳 order_number）
  │ ① liff.sendMessages() 發一則含訂單編號的文字進 LINE@ 聊天室
  ▼
LINE@（Messaging API 官方帳號）
  │ ② LINE webhook POST 該 message event 給後端
  ▼
POST /api/line/webhook
  │ ③ 驗證 x-line-signature → 解析事件 → 抓訂單編號 → 查 DB 確認 → reply API 回覆
  ▼
客人聊天室看到商家回覆「✅ 點餐完畢！訂單 #xxx …」
```

`reply` 需要 `replyToken`，而 `replyToken` 只在「收到使用者訊息」時才有 →
所以「客人先發訊息」是必要步驟，並非多餘。

## 元件（職責分離）

### 1. `lib/lineMessaging.ts`（新；伺服器端，純邏輯為主，易測）

- `verifyLineSignature(rawBody: string, signature: string, channelSecret: string): boolean`
  - HMAC-SHA256(channelSecret, rawBody) base64，與 `x-line-signature` 比對（timing-safe）。
- `parseOrderNumber(text: string): string | null`
  - 從訊息文字抓訂單編號，格式 `YYYYMMDD-NNNN`（對應現有 `order_number`）。
- `buildConfirmationReply(order): { type: "text"; text: string }`
  - 純函式，依訂單資料組回覆文字（含編號、取餐時間、金額）。
- `replyMessage(replyToken: string, messages, accessToken: string): Promise<void>`
  - POST `https://api.line.me/v2/bot/message/reply`，帶 `Authorization: Bearer <accessToken>`。

### 2. `app/api/line/webhook/route.ts`（新）

- `export const runtime = "nodejs"`、`export const dynamic = "force-dynamic"`。
- `POST`：
  1. 讀**原始 body**：`const raw = await request.text()`（簽章需原始字串）。
  2. 取 `x-line-signature` header；`verifyLineSignature` 失敗 → 回 **401**。
  3. `JSON.parse(raw)` 取 `events[]`。空陣列（LINE 設定時的驗證請求）→ 回 **200**。
  4. 對每個 `event.type === "message" && event.message.type === "text"`：
     - `parseOrderNumber(text)`；無 → 略過（不回覆）。
     - 以編號查 DB 訂單（`prisma.order.findUnique({ where: { orderNumber } }` 或現有查詢）。查無 → 略過。
     - `replyMessage(event.replyToken, [buildConfirmationReply(order)], token)`。
  5. 一律回 **200**（除簽章失敗），即使內部錯誤也 catch 後回 200，避免 LINE 重送風暴。

### 3. `lib/liff.ts`（既有，新增函式）

- `sendOrderMessage(input: { orderNumber: string }): Promise<void>`
  - `!isLiffConfigured()` → return（匿名 / 開發環境）。
  - `liff.isApiAvailable("sendMessages")` 為 false（非從聊天室開）→ return。
  - `await liff.sendMessages([{ type: "text", text: <含 orderNumber 的可辨識文字> }])`。
  - 全程 try/catch，**永不丟錯**（下單已成功，發訊息失敗不可影響結果）。

### 4. `components/checkout/CheckoutFlow.tsx`（既有，最小改動）

- `submit()` 中 `createOrder` 成功後、`router.push("/complete")` 前：
  - `await sendOrderMessage({ orderNumber: order.order_number })`（內部已吞錯）。

## 訊息內容

客人發出（sendMessages，需含可被 `parseOrderNumber` 辨識的編號）：

```
我已送出訂單
訂單編號：20260627-0002
```

商家回覆（buildConfirmationReply）：

```
✅ 點餐完畢，感謝您的訂購！
訂單編號：20260627-0002
取餐時間：今天 15:15
金額：$75
到店請出示編號取餐並付款 🙏
```

> 實際取餐時間 / 金額一律取自 DB 查到的訂單（不採用客人訊息內文）。

## 安全（對齊 CLAUDE.md）

- **驗證 webhook 簽章**，擋偽造請求。
- 訊息中的訂單編號為客人端可控 → **後端以編號查 DB 確認訂單存在**，用 DB 真實資料組回覆。
- `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` / `LINE_MESSAGING_CHANNEL_SECRET` 僅後端、不進前端、不寫死、不 commit。

## 環境變數（新增）

| 變數 | 用途 | 位置 |
| --- | --- | --- |
| `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` | 後端呼叫 reply API | 僅後端，secret |
| `LINE_MESSAGING_CHANNEL_SECRET` | 驗證 webhook 簽章 | 僅後端，secret |

未設定時：webhook 端點視為未啟用 → 略過回覆（不丟錯），維持下單主流程可用。

## 邊界情況

| 情況 | 行為 |
| --- | --- |
| 非訂單訊息（亂打字） | 不回覆，回 200 |
| 訂單編號查無 | 不回覆，回 200 |
| 簽章驗證失敗 | 回 401 |
| LINE 設定 webhook 的驗證空事件 | 回 200 |
| LINE 重送（replyToken 一次性） | 第二次回覆失敗，catch 後無害 |
| 客人非從聊天室開 LIFF | `isApiAvailable` false → 不發訊息，下單照常 |
| 未設定 Messaging 環境變數 | webhook 略過，下單照常 |

## LINE 端設定（寫入 docs/LINE_SETUP.md）

1. 建立 / 使用 **Messaging API 官方帳號**，取得 channel access token（long-lived）+ channel secret。
2. Webhook URL 設為 `https://line-liff-ordering.vercel.app/api/line/webhook`，啟用「使用 webhook」。
3. **關閉「自動回應訊息」**（避免與本回覆衝突）。
4. LIFF app 勾選 **`chat_message.write`** scope。
5. 確認客人開 LIFF 的聊天室 = 此 Messaging API 官方帳號。

## 測試計畫

單元測試：

- `verifyLineSignature`：已知 secret/body 的正確簽章通過、竄改不通過。
- `parseOrderNumber`：合法 `YYYYMMDD-NNNN` 抓出、雜訊回 null。
- `buildConfirmationReply`：依訂單組出預期文字。

webhook handler 測試（mock fetch / DB）：

- 有效簽章 + 存在訂單 → 呼叫 reply（帶正確 replyToken / 內容）。
- 壞簽章 → 401，不呼叫 reply。
- 非訂單文字 → 200，不呼叫 reply。
- 訂單查無 → 200，不呼叫 reply。

人工 QA（需真實 LINE）：

- 手機從官方帳號聊天室開 LIFF → 下單 → 聊天室出現客人訊息 + 商家回覆。

## 文件更新

- `docs/LINE_SETUP.md`：新增 Messaging API + webhook + scope 設定。
- `docs/API.md`：新增 `POST /api/line/webhook` 契約（若檔案存在）。
- `.env.example`：新增兩個 Messaging 變數（留空 + 註解）。
- `docs/DEPLOY.md`：env 清單補上兩個變數。
