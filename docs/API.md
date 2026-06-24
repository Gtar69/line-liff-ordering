# API - LINE LIFF 點餐系統（v1 定稿 2026-06-24）

> 本文件定義 MVP 的 HTTP API contract。對應 `docs/PRD.md`、`docs/UI_FLOW.md` 與 `docs/DB_SCHEMA.md`。
> 設計原則：伺服器計價、伺服器驗證所有輸入、不信任前端身分與價格、Admin API 必須驗證。

## 已確認決策（2026-06-24，v1）

- **技術棧**：Next.js（App Router）Route Handlers + TypeScript + Zod 驗證；PostgreSQL + Prisma。
- **客人身分**：折衷——idToken 驗證失敗仍允許下單（匿名，不寫 `line_user_id`）；後端永不信任前端帶入身分。idToken 一律走 `Authorization: Bearer`。
- **Admin 驗證**：MVP 採**單一共用 token**（`Authorization: Bearer <ADMIN_API_TOKEN>`，存環境變數）+ middleware；後台與廚房**共用同一登入**，廚房以 `scope=kitchen` 區分畫面。先不做帳號表 / 角色分權。
- **取餐時段**：lead 15 分、間隔 15 分、僅當天營業時間內，由 `GET /api/pickup-times` 產生並為唯一可信來源。
- **未營業**：`is_open=false` 或非營業時間時，`POST /api/orders` 回 `422 STORE_CLOSED`。
- **下單上限**：單品 `quantity` ≤ 99、單筆品項列數 ≤ 50。
- **防濫用**：匿名下單端點加基本 rate limit（如以 IP / 短時間內筆數限制），細節於後端 issue 落地。

> LINE 相關資源（LIFF ID / Channel / 官方帳號 / HTTPS 網址）尚未建立，將於開對應 issue 時補上。

## 通則

- **格式**：JSON over HTTPS。請求與回應皆 `application/json; charset=utf-8`。
- **Base path**：`/api`。
- **金額**：整數（元）。
- **時間**：ISO 8601（`timestamptz`），時區資訊保留。
- **錯誤格式**統一如下：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "人類可讀訊息",
    "details": [
      { "field": "customer_phone", "issue": "required" }
    ]
  }
}
```

- **HTTP 狀態碼**：`200` 成功、`201` 建立成功、`400` 驗證錯誤、`401` 未驗證、`403` 無權限、`404` 找不到、`409` 狀態衝突 / 訂單已被變更、`422` 業務規則不符（如必填選項未選、商品不可售）、`500` 伺服器錯誤。

### 錯誤碼（error.code）

| code | 對應狀態 | 說明 |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | 欄位格式 / 必填驗證失敗 |
| `EMPTY_CART` | 422 | 購物車為空 |
| `ITEM_UNAVAILABLE` | 422 | 商品不可售 |
| `INVALID_OPTION_SELECTION` | 422 | 必填選項未選或選取數超出群組規則 |
| `INVALID_PICKUP_TIME` | 422 | 取餐時間不可選 / 已過期 |
| `STORE_CLOSED` | 422 | 店家未營業（`is_open=false` 或非營業時間） |
| `ORDER_LIMIT_EXCEEDED` | 422 | 超出下單上限（單品 > 99 或品項列數 > 50） |
| `UNAUTHORIZED` | 401 | 缺少或無效的身分憑證 |
| `FORBIDDEN` | 403 | 無權限存取 |
| `NOT_FOUND` | 404 | 資源不存在 |
| `INVALID_STATUS_TRANSITION` | 409 | 不允許的訂單狀態轉換 |
| `ORDER_CONFLICT` | 409 | 訂單已被其他使用者變更（樂觀鎖） |
| `INTERNAL_ERROR` | 500 | 未預期錯誤 |

## 身分驗證

### 客人端（LIFF）

- 客人 API 為公開讀取（菜單）+ 寫入（建立訂單，採可選身分）。
- **建立訂單時**，前端若有 LINE LIFF 取得的 `idToken`，一律放於 `Authorization: Bearer <idToken>`（不接受 body 夾帶）。
- 後端**必須**向 LINE 驗證 `idToken`（伺服器端），驗證通過後才把 `line_user_id` 寫入訂單。**不可**信任前端直接帶入的 `userId`。
- **身分策略（已確認）**：採折衷可選身分——`idToken` 缺失或驗證失敗時，仍允許下單但 `line_user_id` 留 null（匿名訂單）。不論何者，後端都不信任前端帶入身分。詳見 `docs/LINE_SETUP.md`。

### 後台 / 廚房端（Admin）

- 所有 `/api/admin/**` 端點**必須**通過 authentication，未驗證一律 `401`。
- **機制（已確認）**：MVP 採單一共用 token——`Authorization: Bearer <ADMIN_API_TOKEN>`（存環境變數，不進前端 bundle）+ middleware 檢查。後台與廚房共用同一登入，廚房以 `scope=kitchen` query 區分回傳，不另做角色分權。不可公開未驗證的 Admin API。

## 客人端 API

### GET /api/store

取得店家設定（顯示用）。

回應 200：

```json
{
  "id": "store_1",
  "name": "示範店家",
  "address": "示範地址",
  "phone": "示範電話",
  "is_open": true,
  "pickup_methods": ["self_pickup"]
}
```

### GET /api/menu

取得完整菜單（分類 + 商品 + 選項）。供菜單瀏覽、商品詳情與選項使用。

Query 參數（皆選填）：

| 參數 | 說明 |
| --- | --- |
| `category_id` | 只回傳指定分類商品 |
| `q` | 關鍵字搜尋（套用全部商品，不限分類） |

回應 200：

```json
{
  "categories": [
    { "id": "cat_1", "name": "分類名稱", "sort_order": 0 }
  ],
  "items": [
    {
      "id": "item_1",
      "category_id": "cat_1",
      "name": "商品名稱",
      "description": "說明",
      "image_url": "https://...",
      "price": 65,
      "is_available": true,
      "option_groups": [
        {
          "id": "grp_1",
          "name": "餐點需求",
          "is_required": true,
          "min_select": 1,
          "max_select": 1,
          "options": [
            { "id": "opt_1", "label": "不辣", "price_delta": 0 },
            { "id": "opt_2", "label": "小辣", "price_delta": 0 }
          ]
        }
      ]
    }
  ]
}
```

備註：
- 內容必須來自商家菜單資料，不得寫死參考截圖內容。
- 不可售商品仍可回傳（`is_available: false`），由前端呈現停用，但後端在下單時會再次驗證並拒絕。

### POST /api/orders

建立訂單。**這是核心端點**，所有驗證與計價在此進行。

請求 body：

```json
{
  "pickup_method": "self_pickup",
  "pickup_time": "2026-06-24T17:00:00+08:00",
  "customer_name": "王小明",
  "customer_phone": "0912345678",
  "note": "不要香菜",
  "items": [
    {
      "menu_item_id": "item_1",
      "quantity": 2,
      "option_ids": ["opt_2", "opt_5"]
    }
  ]
}
```

伺服器驗證（依序）：

1. `items` 不可為空 → 否則 `EMPTY_CART`。
2. 每個 `menu_item_id` 必須存在且 `is_available = true` → 否則 `ITEM_UNAVAILABLE`。
3. `quantity >= 1`。
4. `option_ids` 必須屬於該商品的選項群組；必填群組需滿足 `min_select`，每群組選取數不得超過 `max_select` → 否則 `INVALID_OPTION_SELECTION`。
5. `pickup_method` 必須為 `self_pickup`。
6. `pickup_time` 必須為有效且未過期的可選時段（命中 `GET /api/pickup-times` 產生的時段，依 lead 15 / 間隔 15 / 當天營業時間）→ 否則 `INVALID_PICKUP_TIME`。
7. 店家必須營業：`stores.is_open = true` 且 `pickup_time` 落在當天營業時段內 → 否則 `STORE_CLOSED`。
8. 下單上限：每品項 `quantity` 介於 1..99、單筆品項列數 ≤ 50 → 否則 `ORDER_LIMIT_EXCEEDED`。
9. `customer_name`、`customer_phone` 必填且非空白。
10. `note` 長度 <= 200。
11. **價格全部由伺服器計算**，忽略前端任何金額欄位。

成功回應 201：

```json
{
  "id": "order_1",
  "order_number": "20260624-0007",
  "status": "pending",
  "store_name": "示範店家",
  "pickup_method": "self_pickup",
  "pickup_time": "2026-06-24T17:00:00+08:00",
  "subtotal": 130,
  "total": 130,
  "items": [
    {
      "name": "商品名稱",
      "unit_price": 65,
      "quantity": 2,
      "line_total": 130,
      "options": [
        { "group_name": "餐點需求", "label": "小辣", "price_delta": 0 }
      ]
    }
  ],
  "created_at": "2026-06-24T16:30:00+08:00",
  "payment_note": "請於取餐時到店付款"
}
```

> 回應供「訂單完成頁」直接使用：訂單編號、店名、取餐方式 / 時間、總金額、到店付款提醒。

### GET /api/pickup-times（選填）

回傳可選取餐時段，供結帳步驟 1 的時間下拉使用。時段依 `stores.business_hours` / `pickup_lead_minutes`（15）/ `pickup_interval_minutes`（15）產生，僅當天營業時間內，**可配置，不寫死營業假設**。此端點為取餐時段的唯一可信來源；`POST /api/orders` 會再次驗證 `pickup_time` 是否命中。

回應 200：

```json
{
  "slots": [
    { "value": "2026-06-24T17:00:00+08:00", "label": "今天 06-24 17:00" },
    { "value": "2026-06-24T17:15:00+08:00", "label": "今天 06-24 17:15" }
  ]
}
```

> 若 MVP 初期前端先以本機規則產生時段，仍須在 `POST /api/orders` 端再次驗證 `pickup_time`。

## 後台 / 廚房 API（需驗證）

所有以下端點需通過 Admin authentication。

### GET /api/admin/orders

訂單列表，預設今日。

Query 參數：

| 參數 | 說明 |
| --- | --- |
| `date` | 預設今日（店家時區） |
| `status` | 篩選單一狀態，可重複 |
| `scope` | `kitchen` 時只回傳 `pending` 與 `preparing` |

回應 200：

```json
{
  "orders": [
    {
      "id": "order_1",
      "order_number": "20260624-0007",
      "status": "pending",
      "created_at": "2026-06-24T16:30:00+08:00",
      "pickup_time": "2026-06-24T17:00:00+08:00",
      "customer_name": "王小明",
      "customer_phone": "0912345678",
      "total": 130,
      "items_summary": "商品名稱 x2 ...",
      "item_count": 1
    }
  ]
}
```

### GET /api/admin/orders/:id

訂單明細（含完整品項、選項、備註、狀態歷史）。

回應 200：

```json
{
  "id": "order_1",
  "order_number": "20260624-0007",
  "status": "pending",
  "pickup_method": "self_pickup",
  "pickup_time": "2026-06-24T17:00:00+08:00",
  "customer_name": "王小明",
  "customer_phone": "0912345678",
  "note": "不要香菜",
  "subtotal": 130,
  "total": 130,
  "items": [
    {
      "name": "商品名稱",
      "unit_price": 65,
      "quantity": 2,
      "line_total": 130,
      "options": [{ "group_name": "餐點需求", "label": "小辣", "price_delta": 0 }]
    }
  ],
  "status_history": [
    { "to_status": "pending", "changed_at": "2026-06-24T16:30:00+08:00" }
  ],
  "updated_at": "2026-06-24T16:30:00+08:00"
}
```

### PATCH /api/admin/orders/:id/status

更新訂單狀態。後端強制 PRD 允許的狀態轉換。

請求 body：

```json
{
  "to_status": "preparing",
  "expected_current_status": "pending"
}
```

- `expected_current_status`（選填但建議）作為樂觀鎖：若與 DB 現值不符 → `409 ORDER_CONFLICT`（「訂單已被其他使用者變更」）。
- 不允許的轉換 → `409 INVALID_STATUS_TRANSITION`。
- 取消即 `to_status: "cancelled"`，需符合允許轉換（`pending` / `preparing` / `ready` -> `cancelled`）。

成功回應 200：回傳更新後訂單明細。每次成功變更寫入 `order_status_history`。

## 不在 MVP 的端點

除非使用者明確要求，不實作：付款 / LINE Pay / 信用卡、優惠券、會員、外送、多分店、獨立客人訂單查詢入口、完整菜單管理 CRUD API。

> 菜單在 MVP 透過 seed / 匯入維護，不需公開菜單管理寫入 API。

## 需測試項目（對應 CLAUDE.md）

後端 / API：
- 有效訂單建立（回傳唯一訂單編號、狀態 `pending`）。
- 無效 payload（缺欄位、型別錯誤）。
- 缺少必填欄位（姓名 / 電話 / 取餐時間）。
- 空購物車 → `EMPTY_CART`。
- 必填商品選項未選 → `INVALID_OPTION_SELECTION`。
- 商品不可售 → `ITEM_UNAVAILABLE`。
- 備註超過 200 字。
- 伺服器計價：忽略前端價格，總金額與品項小計正確。
- 狀態轉換：合法轉換成功、非法轉換 `409`、樂觀鎖衝突 `409`。
- Admin 端點未驗證 → `401`。

## 技術棧備註（已確認）

- REST + JSON，採 Next.js（App Router）Route Handlers。
- 輸入驗證以 Zod schema 集中於後端。
- LIFF idToken 驗證需呼叫 LINE 端，細節於 `docs/LINE_SETUP.md`。

## 已知待處理（開 issue 時補，不在本批文件範圍）

- **訂單建立冪等性**：對應 `ACCEPTANCE_TESTS.md` G2「重試不產生重複訂單」。建議於後端訂單 issue 實作 `Idempotency-Key` header（client 產生，伺服器短時間內對同 key 回傳同一筆訂單；DB 可加 `orders.idempotency_key` UNIQUE）。本批文件先不定稿其欄位細節。
- **LINE 前置資源**：LIFF ID / Channel ID / Channel Secret / 官方帳號 Rich Menu / 對外 HTTPS 網址，尚未建立，待 LINE 整合 issue 補（見 `docs/LINE_SETUP.md`）。
- **Admin token 輪換 / 多帳號**：MVP 單一共用 token 足夠；如需多帳號或角色分權為日後增強。
