# LINE_SETUP - LINE LIFF 點餐系統（v1 定稿 2026-06-24）

> 定義 LINE LIFF / LINE Login 的設定與整合方式。對應 `docs/PRD.md`、`docs/UI_FLOW.md`、`docs/API.md`。
> **重要**：依 CLAUDE.md，LINE LIFF 設定於 LINE 整合 issue 才實作。本文件先把設定步驟與安全規則定稿。

## 資源建立狀態（2026-06-24）

LINE 前置資源**尚未建立**，將於開「LINE 整合」issue 時依本文件步驟逐項補上，再進入實作：

- [ ] LINE Developers 帳號 + Provider
- [ ] LINE Login channel（取得 `Channel ID` / `Channel Secret`）
- [ ] LIFF app（取得 `LIFF ID`、設定 Endpoint URL）
- [ ] LINE 官方帳號 + Rich Menu「點餐」入口
- [ ] 對外可達的 HTTPS LIFF 網址（本機用通道工具）

## 已確認決策（2026-06-24，v1）

- **身分策略**：採**可選身分（折衷）**——建立訂單時若有 `idToken` 則後端驗證並寫入 `line_user_id`；缺失或驗證失敗時仍允許下單，記為匿名訂單（`line_user_id` = null）。後端永不信任前端帶入身分。
- **idToken 傳遞**：一律走 `Authorization: Bearer <idToken>`。
- **LIFF Size**：`Full`（行動優先）。**Scope**：`profile`、`openid`。

## 目標

- 客人從 LINE 官方帳號圖文選單的「點餐」進入 LIFF 點餐頁。
- LIFF app 在 LINE 內建瀏覽器中執行，行動優先。
- 客人身分透過 LINE LIFF 取得，敏感身分處理在**伺服器端驗證**。
- LIFF 初始化失敗時提供清楚錯誤與 fallback。

## MVP 範圍

涵蓋：
- LINE Login channel + LIFF app 建立。
- LIFF 初始化、登入、取得 `idToken`。
- 伺服器端驗證 `idToken`，取得可信的 LINE user id。
- 圖文選單「點餐」入口連到 LIFF URL。

不涵蓋（非 MVP，除非使用者要求）：
- LINE Pay / 任何線上付款。
- Messaging API 推播訂單狀態通知（可列為日後增強）。
- 官方帳號自動回覆邏輯。
- Rich Menu 進階多頁切換（MVP 僅需一個可開 LIFF 的入口）。

## 前置需求

1. **LINE Developers 帳號**與一個 Provider。
2. **LINE Login channel**（LIFF 依附其上）。
3. **LINE Official Account**（官方帳號）與圖文選單（Rich Menu）設定能力。
4. 已部署、可由手機 LINE 連到的 **HTTPS** LIFF 頁面網址（本機開發可用通道工具或 LIFF 的開發網址）。

## 設定步驟（草稿）

### 1. 建立 LINE Login channel
- 於 LINE Developers Console 在 Provider 下建立 **LINE Login** channel。
- 記錄 `Channel ID` 與 `Channel Secret`（Secret 僅後端使用，不可進前端）。

### 2. 建立 LIFF app
- 在該 channel 的 **LIFF** 分頁新增 LIFF app。
- **Endpoint URL**：指向點餐頁（如 `https://<your-domain>/liff`）。
- **Size**：建議 `Full`（行動優先全畫面）。
- **Scope**：至少 `profile`、`openid`（以取得 idToken）。
- 記錄產生的 `LIFF ID`。

### 3. 圖文選單入口
- 於官方帳號後台（或 Messaging API）建立 Rich Menu。
- 「點餐 Order」按鈕動作設為開啟 LIFF URL：`https://liff.line.me/<LIFF_ID>`。
- 「營業資訊」「訂單查詢」非 MVP，可不連動或先隱藏。

### 4. 前端 LIFF 初始化（待實作）
- 載入 LIFF SDK，以 `LIFF ID` 呼叫 `liff.init()`。
- 若未登入則導向登入；登入後可取得 `idToken`（`liff.getIDToken()`）。
- 初始化失敗 → 顯示清楚錯誤畫面與重試，不可白畫面（對應 UI_FLOW 流程 1 與錯誤狀態）。

### 5. 後端驗證 idToken（待實作，安全關鍵）
- 建立訂單時前端夾帶 `idToken`（見 `docs/API.md` 身分驗證）。
- 後端**必須**向 LINE 的 token 驗證端點驗證 `idToken`（檢查簽章、`aud` 對應本 channel、未過期），通過後才取出可信的 LINE user id 寫入 `orders.line_user_id`。
- **絕不**信任前端直接帶入的 `userId` / profile。

## 環境變數（草稿）

| 變數 | 用途 | 放置位置 |
| --- | --- | --- |
| `LIFF_ID` | 前端 LIFF 初始化 | 前端可見（公開值） |
| `LINE_LOGIN_CHANNEL_ID` | 後端驗證 idToken 的 `aud` | 後端 |
| `LINE_LOGIN_CHANNEL_SECRET` | 後端驗證 / 必要時換 token | **僅後端，secret** |

規則：
- `.env` **不可** commit（見 CLAUDE.md 安全規則）。提供 `.env.example` 範本，值留空或填佔位。
- secret 不可寫死在程式碼，不可暴露到前端 bundle。
- 只有公開的 `LIFF_ID` 可進前端。

## 安全規則（對應 CLAUDE.md）

- 不在未驗證情況下信任前端提供的 LINE 身分。
- 敏感身分處理一律伺服器端驗證 idToken。
- 不把 secret 暴露到前端，不 commit `.env`，不寫死 API key。
- LIFF API 僅假設在 LIFF 環境可用；非 LIFF 環境需有 fallback。

## 開發 / 測試注意

- LIFF 必須在手機 LINE 中實機驗證；桌機瀏覽器行為可能不同。
- 本機開發需 HTTPS 可達網址（通道工具或 LIFF 開發網址）。
- 測試項目：
  - LIFF 初始化成功 / 失敗（失敗有錯誤與重試）。
  - 取得 idToken 並由後端驗證通過 / 失敗。
  - 偽造 / 過期 idToken 被後端拒絕。
  - 非 LIFF 環境（一般瀏覽器）有合理 fallback。
- 因 LIFF 需真實 LINE 環境與憑證，自動化測試難涵蓋，需以人工 QA 補足並清楚記錄。

## 與 MVP 的關係（身分為可選的折衷）

- MVP 核心是「能下單、能取得訂單編號、到店付款」。為避免身分驗證阻塞主流程，**已確認採可選身分（折衷）**：
  - 建立訂單時若有 idToken，後端驗證後寫入 `line_user_id`。
  - idToken 缺失 / 驗證失敗時，仍允許下單但不寫入 `line_user_id`，記錄為匿名訂單。
- 不論何者，後端都不可信任前端帶入的身分。

## 日後增強（非 MVP）

- 以 Messaging API 推播訂單狀態變更通知客人。
- 綁定 LINE user id 與歷史訂單（需獨立訂單查詢入口，目前非 MVP）。

> 身分策略已確認（可選身分折衷）。待 LINE 前置資源建立（見頂部狀態清單）後，於 LINE 整合 issue 進入 LIFF 實作。
