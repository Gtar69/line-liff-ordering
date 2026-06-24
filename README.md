# LINE LIFF 點餐系統

這是一個給 LINE 官方帳號使用的 LIFF 點餐系統。客人從 LINE 官方帳號進入點餐頁，瀏覽菜單、選擇餐點、加入購物車、填寫訂購資訊、送出訂單，取得訂單編號後到店付款取餐。

第一版的目標是做出簡單、穩定、手機好操作的到店自取點餐流程。MVP 不串接線上付款，也不做完整 POS、會員、優惠券、外送或多分店管理。

參考截圖只用來說明點餐流程與互動型態，不代表固定店名、固定商品、固定分類或固定價格。正式產品必須讓商家放入自己的菜單資料。

## 文件說明

目前本文件包先定義產品與畫面流程，讓 Claude Code 可以接續拆 Issue、補技術文件並實作。

- `docs/PRD.md`：可執行版產品需求文件，定義 MVP 範圍、角色、業務規則、訂單狀態與非 MVP。
- `docs/UI_FLOW.md`：客人端、結帳、店家端、廚房端的畫面與互動流程。
- `CLAUDE.md`：Claude Code 在本專案中的開發規則、協作規則與交付格式。

以下文件已完成 v1 定稿（2026-06-24），可作為後端、API、驗收與 LINE 整合的依據：

- `docs/DB_SCHEMA.md`：資料表、enum、關聯、計價與訂單編號規則。
- `docs/API.md`：端點、payload、驗證、錯誤碼、身分與 Admin 驗證。
- `docs/ACCEPTANCE_TESTS.md`：Given/When/Then 驗收與人工 QA 清單。
- `docs/LINE_SETUP.md`：LIFF / LINE Login 設定與身分策略（LINE 資源待建立）。

> 技術棧（已確認）：Next.js + TypeScript + PostgreSQL + Prisma + Zod + Tailwind，部署 Vercel + Neon/Supabase。

## 產品摘要

### 客人端

客人應能在手機上的 LINE LIFF 中完成以下流程：

- 從 LINE 官方帳號點擊「點餐」進入 LIFF。
- 查看商品分類、搜尋商品、瀏覽商品卡片。
- 開啟商品詳情，選擇數量與必要餐點需求。
- 查看購物車小計並進入確認訂單。
- 選擇取餐方式與取餐時間。
- 填寫訂購人、手機號碼與備註。
- 送出訂單並看到唯一訂單編號。
- 到店付款並取餐。

### 店家後台

店家櫃台應能：

- 查看今日訂單。
- 查看訂單明細。
- 更新訂單狀態。
- 取消訂單。

### 廚房端

廚房人員應能：

- 查看待製作與製作中的訂單。
- 清楚看到訂單編號、商品名稱、數量、餐點需求與備註。
- 快速辨識訂單狀態。

## MVP 決策

- 只支援單一店家與單一門市。
- 只支援到店自取。
- 只支援到店付款。
- 商品資料必須能支援分類、圖片、價格、上下架狀態與餐點需求選項。
- 商家必須可以使用自己的菜單資料；第一版可以先用 seed data、JSON/CSV 匯入、後台最小維護工具或其他簡單方式建立菜單。
- 完整菜單管理後台不是第一版必須項目，除非使用者另行指定。
- 客人端必須行動優先。
- 店家端與廚房端以清楚、穩定、低操作成本為優先。

## MVP 不包含

第一版不要實作以下功能，除非使用者明確要求：

- 線上付款
- LINE Pay
- 信用卡付款
- 發票
- 會員點數
- 優惠券
- 外送
- 多分店管理
- 複雜庫存管理
- AI 推薦餐點
- 自動排班
- 進銷存系統
- 完整 POS 系統
- 揪團點餐
- 獨立訂單查詢入口

## 建議實作順序

建議 Claude Code 將開發拆成小 Issue：

1. 專案初始化與技術棧決策
2. 商家菜單資料來源與範例商家菜單
3. 依 `docs/UI_FLOW.md` 建立菜單瀏覽 UI
4. 商品詳情彈窗與商品選項選擇
5. 購物車狀態與小計顯示
6. 結帳 Step 1：取餐方式與取餐時間
7. 結帳 Step 2：顧客資訊與備註
8. 在 `docs/DB_SCHEMA.md` 與 `docs/API.md` 準備完成後建立後端訂單基礎
9. 店家訂單列表與訂單明細
10. 廚房顯示畫面
11. 在 `docs/LINE_SETUP.md` 準備完成後整合 LINE LIFF

## 開發注意事項

- PR 要保持小而聚焦。
- 不要意外導入線上付款。
- 不要信任前端價格或前端提供的使用者身分。
- 不要把參考截圖中的店名、分類、商品、圖片或價格寫成固定產品需求。
- 不要只因為參考產品截圖中有某個功能，就做出 PRD 範圍外的功能。
- 當實作需要資料庫、API、驗收測試或 LINE 設定細節時，先建立對應文件並取得使用者確認，再開始寫程式。

## 本機開發（Issue #1 起）

技術棧：Next.js(App Router) + TypeScript + Tailwind + Vitest。

```bash
npm install        # 安裝相依套件
npm run dev        # 啟動開發伺服器 http://localhost:3000
npm run lint       # ESLint
npm run format     # Prettier 格式化（format:check 只檢查）
npm run test       # Vitest 單元測試
npm run build      # production build
```

環境變數：複製 `.env.example` 為 `.env.local` 後填值；`.env*` 不會 commit。CI 於 push / PR 時跑 lint、format、test、build（見 `.github/workflows/ci.yml`）。
