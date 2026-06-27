# 部署指南：Vercel + Supabase

本文件說明如何把本專案（Next.js 15 全端 app + Prisma + PostgreSQL）部署到
**Vercel**（app / serverless API）搭配 **Supabase**（PostgreSQL）做測試 / 上線。

> 適用範圍：MVP 單店單門市、到店自取、到店付款。LINE LIFF 設定見 `docs/LINE_SETUP.md`。

## 架構摘要

- 前端 LIFF 與後端 API（`app/api/*` route handlers）同屬一個 Next.js app。
- API route 全部 `runtime = "nodejs"`（因使用 Prisma），對應 Vercel Node serverless function。
- DB 為 PostgreSQL，透過 Prisma 連線；正式用 Supabase 託管。

## 連線字串：兩條（重要）

Supabase + serverless 必須用兩條連線字串，分別給 runtime 與 migration：

| 用途 | Supabase 來源 | port | 對應環境變數 |
| --- | --- | --- | --- |
| App runtime（連線池） | Transaction pooler | `6543` | `DATABASE_URL`（結尾加 `?pgbouncer=true`） |
| `prisma migrate deploy` | Direct / Session 連線 | `5432` | `DIRECT_URL` |

`prisma/schema.prisma` 已設定 `url = env("DATABASE_URL")`、`directUrl = env("DIRECT_URL")`，
migrate 會自動走 `DIRECT_URL`（pgbouncer 不支援 migration），runtime 走 pooler。

取得方式：Supabase 專案 →「Connect」→「ORMs → Prisma」，直接複製 `.env` 兩條，
把 `[YOUR-PASSWORD]` 換成建立專案時設定的資料庫密碼。

## 環境變數清單（在 Vercel 設定）

| 變數 | 必填 | 值 | 備註 |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✅ | Supabase Transaction pooler（6543，`?pgbouncer=true`） | runtime 查詢用 |
| `DIRECT_URL` | ✅ | Supabase Direct 連線（5432） | migrate 用 |
| `ADMIN_API_TOKEN` | ✅ | 自訂高強度隨機字串 | 後台 / 廚房共用；勿外流 |
| `NEXT_PUBLIC_LIFF_ID` | ⬜ | LIFF ID | 留空＝匿名下單；接 LINE 後填，見 `docs/LINE_SETUP.md` |
| `LINE_LOGIN_CHANNEL_ID` | ⬜ | LINE Login channel ID | 後端驗證 idToken 的 aud；留空＝匿名 |
| `LINE_LOGIN_CHANNEL_SECRET` | ⬜ | channel secret | 目前程式未使用，可留空 |

`ADMIN_API_TOKEN` 可用以下指令產生：

```bash
openssl rand -hex 32
```

## 部署步驟

### 1. 建立 Supabase 專案

1. 建立 project，設定並記下資料庫密碼。
2. 「Connect → ORMs → Prisma」取得 `DATABASE_URL`（6543）與 `DIRECT_URL`（5432）。

### 2. 在 Vercel 匯入專案

1. Add New → Project → Import `Gtar69/line-liff-ordering`。
2. Framework 自動偵測為 Next.js，Root Directory 為 `./`，皆不需更動。
3. 展開 **Environment Variables**，依上表填入（至少 `DATABASE_URL`、`DIRECT_URL`、`ADMIN_API_TOKEN`）。
4. 按 **Deploy**。

部署時 build command 為 `prisma migrate deploy && next build`（見 `vercel.json`），
會先把 migration 套用到 Supabase（建立資料表），再 build。

### 3. 灌入菜單資料（首次，手動執行一次）

migration 只建立空資料表，菜單需另外匯入。**不放進 build**，避免每次部署覆蓋商家菜單。
在本機指向 Supabase 執行一次即可：

```bash
# 在本機 .env / .env.local 暫時填入 Supabase 的 DATABASE_URL 與 DIRECT_URL
# 匯入商家自有菜單（建議）：
npm run db:import -- path/to/your-menu.json

# 或先用示範菜單測試流程：
npm run db:seed
```

> 注意：`importMenu` 會重置該店現有菜單後重建，但不影響 orders。
> 依專案規則，示範菜單僅供測試，正式內容請以商家自有 JSON 匯入。

### 4. 驗證

- 開啟 Vercel 給的 `https://<project>.vercel.app`，確認菜單載入正常。
- 後台 `/admin/orders`、廚房 `/kitchen` 需帶 `ADMIN_API_TOKEN` 授權。
- 接 LINE LIFF：見 `docs/LINE_SETUP.md`。

## 本機開發備註

`schema.prisma` 新增了 `directUrl`。本機 runtime 只用 `DATABASE_URL`，
但若要在本機跑 `prisma migrate`，請在 `.env.local` 也補上 `DIRECT_URL`
（本機可與 `DATABASE_URL` 相同的直連字串）。

## 常見問題

- **部署成功但打開報錯 / 菜單空白**：多半是 env 未設定或菜單未匯入（步驟 3）。
- **migrate 失敗 `prepared statement` / pgbouncer 相關**：確認 `DIRECT_URL` 用的是 5432 直連，而非 6543 pooler。
- **Admin / 廚房 401**：未設定或帶錯 `ADMIN_API_TOKEN`。
