# DB_SCHEMA - LINE LIFF 點餐系統（v1 定稿 2026-06-24）

> 本文件定義 MVP 資料庫結構。實際 DDL / migration 以 PostgreSQL + Prisma 落地（見文末「技術棧備註」）。
> 設計原則：菜單為商家可配置資料、訂單以快照保存、伺服器負責計價、單店單門市、到店自取、到店付款。

## 已確認決策（2026-06-24，v1）

以下決策已由使用者確認，本文件據此定稿。LINE 相關資源（LIFF ID / Channel / 官方帳號 / HTTPS 網址）尚未建立，將於開對應 issue 時補上，不影響本 schema。

- **技術棧**：PostgreSQL + Prisma（ORM / migration）。金額一律整數（元）。
- **身分**：折衷策略——idToken 驗證失敗仍允許下單，但 `orders.line_user_id` 留 null（匿名訂單）；後端永不信任前端帶入身分。
- **取餐時段**：當天營業時間內、最早可取餐 lead 15 分、間隔 15 分（由 `stores.pickup_lead_minutes` / `pickup_interval_minutes` / `business_hours` 控制，可配置）。
- **未營業 / `is_open=false`**：客人可瀏覽、不可送單（後端拒絕建立訂單）。
- **下單上限**：單一品項 `quantity` ≤ 99；單筆訂單品項列數 ≤ 50（防灌單）。
- **訂單編號**：`YYYYMMDD-當日序號`（如 `20260624-0007`）。
- **菜單來源**：seed + JSON 匯入；MVP 不做菜單管理 UI；上下架靠 `is_available`。
- **語言**：僅繁體中文。

## 設計原則

- **菜單與訂單分離**：菜單資料（`categories` / `menu_items` / `option_groups` / `options`）是商家可替換的設定來源；訂單資料保存當下快照，菜單變更不影響歷史訂單。
- **價格由伺服器計算**：前端送出的價格僅供 UX，不可信任。`orders.subtotal` / `orders.total` 與每個 `order_items.line_total` 都由後端依當下菜單價格重新計算。
- **快照保存**：`order_items` 與 `order_item_options` 儲存商品名稱、單價、選項標籤與加價的快照，不依賴 `menu_items` 是否仍存在或價格是否變動。
- **單店單門市**：`stores` 只會有一筆有效資料，但仍以資料表呈現，未來可擴充。
- **狀態機**：`orders.status` 僅允許 PRD 定義的 enum 與轉換；轉換記錄寫入 `order_status_history`。
- **不含付款資料**：MVP 為到店付款，不儲存任何付款 / 金流 / 發票欄位。

## Enum 定義

### order_status

| 值 | 意義 |
| --- | --- |
| `pending` | 新訂單 |
| `preparing` | 製作中 |
| `ready` | 可取餐 |
| `picked_up` | 已取餐 |
| `cancelled` | 已取消 |

允許的狀態轉換（於後端強制，違反則拒絕）：

- `pending` -> `preparing`
- `pending` -> `cancelled`
- `preparing` -> `ready`
- `preparing` -> `cancelled`
- `ready` -> `picked_up`
- `ready` -> `cancelled`

### pickup_method

| 值 | 意義 |
| --- | --- |
| `self_pickup` | 到店自取（MVP 唯一值） |

> MVP 僅 `self_pickup`。保留為 enum 以利日後擴充，但 UI 與 API 在 MVP 只接受此值。

## 資料表

### stores（店家設定）

單店單門市。MVP 預期只有一筆有效資料。取餐時段由 `business_hours` + `pickup_lead_minutes`（預設 15）+ `pickup_interval_minutes`（預設 15）產生，僅限當天營業時間內。`is_open=false` 或非營業時間時，客人端可瀏覽但後端拒絕建立訂單。

| 欄位 | 型別 | 限制 | 說明 |
| --- | --- | --- | --- |
| `id` | uuid / bigint PK | NOT NULL | 主鍵 |
| `name` | varchar(100) | NOT NULL | 店家顯示名稱（商家可配置） |
| `address` | varchar(255) | NULL | 店家地址，結帳與完成頁顯示 |
| `phone` | varchar(50) | NULL | 店家電話 |
| `timezone` | varchar(50) | NOT NULL, default `Asia/Taipei` | 計算取餐時段用 |
| `pickup_lead_minutes` | int | NOT NULL, default 15 | 最早可取餐距現在的分鐘數 |
| `pickup_interval_minutes` | int | NOT NULL, default 15 | 取餐時段間隔 |
| `business_hours` | jsonb / text | NULL | 營業時間設定，用於產生取餐時段（可配置，避免寫死） |
| `is_open` | boolean | NOT NULL, default true | 是否接單 |
| `created_at` | timestamptz | NOT NULL | |
| `updated_at` | timestamptz | NOT NULL | |

### categories（分類）

| 欄位 | 型別 | 限制 | 說明 |
| --- | --- | --- | --- |
| `id` | uuid / bigint PK | NOT NULL | |
| `store_id` | FK -> stores.id | NOT NULL | |
| `name` | varchar(100) | NOT NULL | 分類名稱（商家可配置，不可寫死參考截圖內容） |
| `sort_order` | int | NOT NULL, default 0 | 顯示排序 |
| `is_active` | boolean | NOT NULL, default true | 是否顯示此分類 |
| `created_at` | timestamptz | NOT NULL | |
| `updated_at` | timestamptz | NOT NULL | |

索引：`(store_id, sort_order)`

### menu_items（商品）

| 欄位 | 型別 | 限制 | 說明 |
| --- | --- | --- | --- |
| `id` | uuid / bigint PK | NOT NULL | |
| `store_id` | FK -> stores.id | NOT NULL | |
| `category_id` | FK -> categories.id | NOT NULL | |
| `name` | varchar(150) | NOT NULL | 商品名稱（商家可配置） |
| `description` | text | NULL | 商品說明 |
| `image_url` | varchar(500) | NULL | 商品圖片 |
| `price` | int | NOT NULL, >= 0 | 售價，以最小貨幣單位（元）儲存為整數，避免浮點誤差 |
| `is_available` | boolean | NOT NULL, default true | 是否可售；false 不可下單 |
| `sort_order` | int | NOT NULL, default 0 | |
| `created_at` | timestamptz | NOT NULL | |
| `updated_at` | timestamptz | NOT NULL | |

索引：`(store_id, category_id, sort_order)`；搜尋可在 `name` 上建索引或全文索引。

### option_groups（選項群組）

商品專屬的必填 / 選填選項群組（如「辣度」「胡椒」）。

> 取捨備註（MVP 可接受）：選項群組綁定單一 `menu_item_id`，不跨商品共用。對「每樣商品都共用相同辣度／胡椒」的店家會有資料重複；日後若需要共用，再加 `option_group_templates` 之類的共用層，不在 MVP。

| 欄位 | 型別 | 限制 | 說明 |
| --- | --- | --- | --- |
| `id` | uuid / bigint PK | NOT NULL | |
| `menu_item_id` | FK -> menu_items.id | NOT NULL | 群組屬於單一商品 |
| `name` | varchar(100) | NOT NULL | 群組名稱，如 `餐點需求` |
| `is_required` | boolean | NOT NULL, default false | 是否必填 |
| `min_select` | int | NOT NULL, default 0 | 最少選取數 |
| `max_select` | int | NOT NULL, default 1 | 最多選取數（單選=1，多選>1） |
| `sort_order` | int | NOT NULL, default 0 | |

驗證約束（後端強制）：`min_select <= max_select`；`is_required = true` 時 `min_select >= 1`。

索引：`(menu_item_id, sort_order)`

### options（選項）

| 欄位 | 型別 | 限制 | 說明 |
| --- | --- | --- | --- |
| `id` | uuid / bigint PK | NOT NULL | |
| `option_group_id` | FK -> option_groups.id | NOT NULL | |
| `label` | varchar(100) | NOT NULL | 選項標籤，如 `小辣` |
| `price_delta` | int | NOT NULL, default 0, >= 0 | 加價，可為 0 |
| `is_available` | boolean | NOT NULL, default true | |
| `sort_order` | int | NOT NULL, default 0 | |

索引：`(option_group_id, sort_order)`

### orders（訂單）

| 欄位 | 型別 | 限制 | 說明 |
| --- | --- | --- | --- |
| `id` | uuid / bigint PK | NOT NULL | |
| `store_id` | FK -> stores.id | NOT NULL | |
| `order_number` | varchar(30) | NOT NULL, UNIQUE | 對客人顯示的唯一訂單編號 |
| `status` | order_status enum | NOT NULL, default `pending` | |
| `pickup_method` | pickup_method enum | NOT NULL, default `self_pickup` | |
| `pickup_time` | timestamptz | NOT NULL | 客人選擇的取餐時間 |
| `customer_name` | varchar(100) | NOT NULL | 訂購人 |
| `customer_phone` | varchar(30) | NOT NULL | 手機號碼 |
| `note` | varchar(200) | NULL | 訂單備註，最多 200 字 |
| `subtotal` | int | NOT NULL, >= 0 | 伺服器計算的商品小計 |
| `total` | int | NOT NULL, >= 0 | 伺服器計算的總金額（MVP 無折扣 / 運費，total = subtotal） |
| `line_user_id` | varchar(100) | NULL | 由伺服器端驗證 LIFF idToken 後寫入，不信任前端直接帶入 |
| `created_at` | timestamptz | NOT NULL | 建立時間 |
| `updated_at` | timestamptz | NOT NULL | |

索引：`(store_id, created_at)`（後台今日訂單）、`(store_id, status)`（廚房 / 篩選）、`order_number` UNIQUE。

> 訂單編號產生策略見文末「訂單編號」。

### order_items（訂單品項快照）

| 欄位 | 型別 | 限制 | 說明 |
| --- | --- | --- | --- |
| `id` | uuid / bigint PK | NOT NULL | |
| `order_id` | FK -> orders.id | NOT NULL, ON DELETE CASCADE | |
| `menu_item_id` | FK -> menu_items.id | NULL | 參考用，可為 null（商品日後被刪不影響訂單） |
| `name_snapshot` | varchar(150) | NOT NULL | 下單當下商品名稱 |
| `unit_price_snapshot` | int | NOT NULL, >= 0 | 下單當下商品單價（不含選項加價） |
| `quantity` | int | NOT NULL, 1..99 | 數量（單品上限 99，見計價規則） |
| `line_total` | int | NOT NULL, >= 0 | (unit_price + 該品項所有選項加價) * quantity，由伺服器計算 |

索引：`(order_id)`

### order_item_options（訂單品項選項快照）

| 欄位 | 型別 | 限制 | 說明 |
| --- | --- | --- | --- |
| `id` | uuid / bigint PK | NOT NULL | |
| `order_item_id` | FK -> order_items.id | NOT NULL, ON DELETE CASCADE | |
| `group_name_snapshot` | varchar(100) | NOT NULL | 選項群組名稱快照 |
| `option_label_snapshot` | varchar(100) | NOT NULL | 選項標籤快照 |
| `price_delta_snapshot` | int | NOT NULL, default 0, >= 0 | 選項加價快照 |

索引：`(order_item_id)`

### order_status_history（狀態歷史）

| 欄位 | 型別 | 限制 | 說明 |
| --- | --- | --- | --- |
| `id` | uuid / bigint PK | NOT NULL | |
| `order_id` | FK -> orders.id | NOT NULL, ON DELETE CASCADE | |
| `from_status` | order_status enum | NULL | 初始建立時為 null |
| `to_status` | order_status enum | NOT NULL | |
| `changed_by` | varchar(100) | NULL | 操作者標識（後台帳號），MVP 可選 |
| `changed_at` | timestamptz | NOT NULL | |

索引：`(order_id, changed_at)`

## 關聯總覽

```
stores 1───* categories 1───* menu_items 1───* option_groups 1───* options
stores 1───* orders 1───* order_items 1───* order_item_options
orders 1───* order_status_history
order_items *───0..1 menu_items   (參考用，可為 null)
```

## 計價規則（伺服器端）

對每個送出的購物車品項：

1. 以 `menu_item_id` 取得當下 `menu_items.price` 與 `is_available`；不可售則拒絕整筆訂單。
2. 驗證選項：所選 `options` 必須屬於該商品的 `option_groups`；必填群組需滿足 `min_select`，且每群組選取數不得超過 `max_select`。
3. `line_total = (unit_price + Σ option.price_delta) * quantity`。
4. `subtotal = Σ line_total`；MVP `total = subtotal`。

下單上限與營業檢查（後端強制）：

- 每個品項 `quantity` 介於 1..99；單筆訂單品項列數 ≤ 50，超過則拒絕（防灌單）。
- 建立訂單時 `stores.is_open` 必須為 true 且 `pickup_time` 落在當天營業時段內；否則拒絕。

前端傳來的任何價格欄位一律忽略，只接受 `menu_item_id`、`quantity`、所選 `option_id` 清單。

## 訂單編號

- 必須唯一（`order_number` UNIQUE 約束）。
- 格式（已確認）：`YYYYMMDD-當日序號`，序號當日從 1 起算、補零至 4 位（如 `20260624-0007`）。
- 產生時需在交易內處理競態（如以當日計數器 + 唯一約束重試），避免重複。

## Seed Data 規則

- Seed 僅供本機示範，**不得**成為正式內容。
- 示範店名可用 `兄弟鹽酥雞-林口街店`，示範分類 / 商品 / 價格 / 選項僅為範例，須清楚標記為可替換。
- 商家正式菜單應透過 seed / JSON 或 CSV 匯入 / 後台最小維護工具載入；菜單結構與 UI 程式碼分離。

## 需測試項目（對應 CLAUDE.md）

- Migration 可正確建立所有表與 enum。
- Seed data 可載入且符合關聯完整性。
- 必填欄位、預設值、`CHECK`（價格 >= 0、quantity >= 1）生效。
- `order_number` 唯一性。
- 外鍵關聯與 `ON DELETE CASCADE` 行為。
- 狀態歷史在每次狀態變更時寫入。

## 技術棧備註（已確認）

本 schema 以 **PostgreSQL** 落地，ORM / migration 採 **Prisma**。
- 金額一律以整數（元）儲存，避免浮點誤差。
- `jsonb` 用於 `business_hours` 等彈性設定。
- `id` 採 uuid 或 bigint 皆可，於 Prisma schema 統一定義。
- 部署：應用 Vercel、資料庫 Neon / Supabase（Postgres）；本機開發以通道工具提供 LIFF 所需 HTTPS。

> 已於 Issue #3 實作：`prisma/schema.prisma`、初始 migration（含 CHECK 約束）、`prisma/seed.ts` 與 `scripts/import-menu.ts`（zod 驗證的菜單匯入）。CI 以 Postgres service 實跑 migrate + seed + 完整性檢查。
