# ACCEPTANCE_TESTS - LINE LIFF 點餐系統（v1 定稿 2026-06-24）

> 以 Given/When/Then 描述 MVP 驗收條件，並提供人工 QA 檢查清單。
> 對應 `docs/PRD.md`、`docs/UI_FLOW.md`、`docs/API.md`、`docs/DB_SCHEMA.md`。
> 所有測試資料皆為可替換範例；不得綁死參考截圖中的店名、商品、分類或價格。
> 已確認決策（見各文件「已確認決策」）：身分採可選（匿名可下單）、Admin 單一共用 token、取餐 lead/間隔 15 分當天、未營業不可下單、單品 ≤99 / 單筆品項 ≤50、廚房 polling。

## 範圍

涵蓋：客人 LIFF 點餐流程、訂單建立與計價、後台訂單管理、廚房顯示、狀態轉換、錯誤與空狀態。
不涵蓋（非 MVP）：線上付款、LINE Pay、優惠券、會員、外送、多分店、揪團、獨立訂單查詢。

---

## A. 菜單瀏覽

### A1 依分類瀏覽
- **Given** 商家菜單已載入且有多個分類
- **When** 客人點擊某分類標籤
- **Then** 商品列表更新為該分類商品，且該標籤高亮

### A2 搜尋全部商品
- **Given** 客人在菜單頁
- **When** 客人輸入關鍵字
- **Then** 顯示符合關鍵字的商品（跨所有分類），清除後回到分類瀏覽

### A3 搜尋無結果
- **Given** 客人輸入不存在的關鍵字
- **When** 搜尋執行
- **Then** 顯示「無搜尋結果」空狀態

### A4 分類無商品
- **Given** 某分類沒有可售商品
- **When** 客人切到該分類
- **Then** 顯示該分類空狀態

### A5 不可售商品
- **Given** 某商品 `is_available = false`
- **When** 客人在菜單看到該商品
- **Then** 商品視覺上停用，且無法加入購物車 / 下單

### A6 菜單載入失敗
- **Given** 菜單 API 失敗
- **When** 客人進入菜單頁
- **Then** 顯示載入失敗錯誤與重試入口

---

## B. 商品詳情與選項

### B1 開啟商品詳情
- **Given** 客人在菜單頁
- **When** 點擊商品卡片
- **Then** 開啟商品詳情彈窗，顯示圖片、名稱、價格、數量加減器，數量預設 1

### B2 數量加減
- **Given** 商品詳情彈窗開啟、數量為 1
- **When** 客人點減號
- **Then** 數量不可低於 1；點加號則遞增

### B3 無必填選項直接加入
- **Given** 商品沒有必填選項群組
- **When** 客人點「選好了」
- **Then** 商品依數量加入購物車

### B4 必填選項未選不可繼續
- **Given** 商品有必填選項群組（`is_required`, `min_select >= 1`）
- **When** 客人未選必填選項就嘗試繼續
- **Then** 阻擋並提示必選

### B5 選項加價顯示與計入
- **Given** 某選項 `price_delta > 0`
- **When** 客人選擇該選項
- **Then** UI 清楚顯示加價，且該品項小計反映加價

### B6 「繼續選購」與「下一步」
- **Given** 必填選項已完成
- **When** 客人點「繼續選購」
- **Then** 商品加入購物車並回菜單瀏覽
- **When** 客人改點「下一步」
- **Then** 商品加入購物車並進入結帳步驟 1

---

## C. 購物車

### C1 小計更新
- **Given** 購物車為空，底部小計為 `$0`
- **When** 客人加入商品
- **Then** 小計更新為正確估算值

### C2 相同商品不同選項視為不同列
- **Given** 同一商品以不同選項各加入一次
- **When** 查看購物車
- **Then** 顯示為兩個獨立品項列

### C3 修改數量 / 移除
- **Given** 購物車有商品
- **When** 客人在送出前調整數量或移除品項
- **Then** 購物車與小計即時更新

### C4 空購物車不可結帳
- **Given** 購物車為空
- **When** 客人嘗試確認訂單
- **Then** `確認訂單` 停用或阻擋進入結帳

---

## D. 結帳步驟 1（取餐方式與時間）

### D1 顯示店名與摘要
- **Given** 客人進入結帳步驟 1
- **Then** 顯示店名、可展開商品摘要與小計

### D2 取餐方式僅自取
- **Given** 步驟 1
- **Then** 取餐方式只有 `自取`（`self_pickup`）

### D3 取餐時間必填
- **Given** 步驟 1 未選取餐時間
- **When** 客人點「下一步」
- **Then** 阻擋並提示需選取餐時間

### D4 取餐時間可配置
- **Given** 店家設定的營業時間 / lead time（lead 15、間隔 15、僅當天）
- **When** 取餐時間下拉產生
- **Then** 時段依設定產生（最早 = 現在 + 15 分、每 15 分一格、限當天營業時間），未寫死固定營業假設

### D5 店家未營業不可送單
- **Given** `stores.is_open = false` 或現在非營業時間
- **When** 客人嘗試送出訂單
- **Then** 客人端仍可瀏覽菜單，但送出被擋；`POST /api/orders` 回 `422 STORE_CLOSED`

---

## E. 結帳步驟 2（訂購資訊）

### E1 顯示取餐與店家資訊
- **Given** 客人進入步驟 2
- **Then** 顯示取餐方式、取餐時間、店家地址與電話（若有）、商品摘要與總計

### E2 訂購人 / 手機必填
- **Given** 步驟 2
- **When** 客人未填訂購人或手機就送出
- **Then** 阻擋並提示必填

### E3 備註最多 200 字
- **Given** 客人輸入備註
- **When** 超過 200 字
- **Then** 阻擋或限制輸入

### E4 上一步保留資料
- **Given** 客人在步驟 2 已輸入資料
- **When** 點「上一步」再回步驟 2
- **Then** 已輸入資料保留

---

## F. 訂單建立與伺服器計價（API）

### F1 有效訂單建立
- **Given** 合法 payload（含商品、選項、取餐時間、姓名、電話）
- **When** `POST /api/orders`
- **Then** 回 `201`，含唯一 `order_number`，狀態 `pending`，到店付款提醒

### F2 伺服器計價（忽略前端價格）
- **Given** payload 帶入被竄改的價格欄位
- **When** 建立訂單
- **Then** 後端以當下菜單價格重新計算 `subtotal` / `total` / `line_total`，竄改值被忽略

### F3 空購物車
- **Given** `items` 為空
- **When** `POST /api/orders`
- **Then** 回 `422 EMPTY_CART`

### F4 缺必填欄位
- **Given** 缺 `customer_name` 或 `customer_phone` 或 `pickup_time`
- **When** 建立訂單
- **Then** 回 `400 VALIDATION_ERROR`

### F5 商品不可售
- **Given** payload 含 `is_available = false` 的商品
- **When** 建立訂單
- **Then** 回 `422 ITEM_UNAVAILABLE`，訂單不建立

### F6 必填選項未選
- **Given** payload 缺某必填群組選項或選取數超出 `max_select`
- **When** 建立訂單
- **Then** 回 `422 INVALID_OPTION_SELECTION`

### F7 無效取餐時間
- **Given** `pickup_time` 已過期或非可選時段
- **When** 建立訂單
- **Then** 回 `422 INVALID_PICKUP_TIME`

### F8 備註超長
- **Given** `note` 超過 200 字
- **When** 建立訂單
- **Then** 回 `400 VALIDATION_ERROR`

### F9 訂單編號唯一
- **Given** 連續建立多筆訂單（含並發）
- **Then** 每筆 `order_number` 皆唯一，無重複

### F10 快照穩定
- **Given** 訂單已建立後菜單價格 / 名稱變更
- **When** 重新查詢該訂單
- **Then** 訂單品項名稱、單價、選項加價維持下單當下快照不變

### F11 店家未營業
- **Given** `is_open = false` 或 `pickup_time` 非當天營業時段
- **When** `POST /api/orders`
- **Then** 回 `422 STORE_CLOSED`，訂單不建立

### F12 下單上限
- **Given** 某品項 `quantity > 99`，或單筆品項列數 > 50
- **When** `POST /api/orders`
- **Then** 回 `422 ORDER_LIMIT_EXCEEDED`，訂單不建立

### F13 匿名下單（可選身分）
- **Given** 未帶 `idToken` 或 idToken 驗證失敗
- **When** `POST /api/orders`（其餘 payload 合法）
- **Then** 仍回 `201` 建立訂單，但 `line_user_id` 為 null；後端不採用前端帶入的任何身分

> 待處理（見 `docs/API.md`「已知待處理」）：G2「重試不產生重複訂單」需後端訂單 issue 補 `Idempotency-Key` 機制後，才能對「網路逾時後重送」場景做自動化驗收；本批文件先標記為 follow-up。

---

## G. 訂單完成頁

### G1 顯示訂單編號與摘要
- **Given** 訂單建立成功
- **Then** 完成頁顯示成功訊息、唯一訂單編號、店名、取餐方式、取餐時間、總金額、到店付款提醒

### G2 送出失敗處理
- **Given** 建立訂單 API 失敗
- **When** 客人送出
- **Then** 顯示清楚錯誤，可重試，不產生重複訂單

---

## H. 後台訂單管理

### H1 今日訂單列表
- **Given** 後台已驗證
- **When** 開啟訂單列表
- **Then** 預設顯示今日訂單，含編號、狀態、建立 / 取餐時間、客人姓名電話、總金額、商品摘要

### H2 新訂單醒目
- **Given** 有 `pending` 新訂單
- **Then** 視覺上明顯可辨識

### H3 訂單明細
- **When** 點擊訂單
- **Then** 顯示完整品項、數量、選項、單列金額、總額、備註、取餐資訊、狀態歷史

### H4 合法狀態轉換
- **Given** 訂單為 `pending`
- **When** 後台更新為 `preparing`
- **Then** 成功並寫入狀態歷史

### H5 非法狀態轉換被拒
- **Given** 訂單為 `pending`
- **When** 嘗試直接更新為 `ready`
- **Then** 回 `409 INVALID_STATUS_TRANSITION`，狀態不變

### H6 取消訂單仍保留
- **Given** 訂單為 `pending` / `preparing` / `ready`
- **When** 後台取消
- **Then** 狀態變 `cancelled`，仍保留於歷史紀錄

### H7 並發變更衝突
- **Given** 兩個後台同時操作同一訂單
- **When** 第二個以過期的 `expected_current_status` 送出
- **Then** 回 `409 ORDER_CONFLICT`，提示訂單已被變更

### H8 Admin 未驗證
- **Given** 未帶有效憑證
- **When** 呼叫任一 `/api/admin/**`
- **Then** 回 `401 UNAUTHORIZED`

---

## I. 廚房顯示

### I1 僅顯示待製作
- **Given** 廚房畫面
- **Then** 只顯示 `pending` 與 `preparing` 訂單，隱藏 `ready` / `picked_up` / `cancelled`

### I2 顯示製作所需資訊
- **Then** 顯示訂單編號、取餐時間、商品名稱、數量、選項、備註、目前狀態

### I3 易讀
- **Then** 文字大、新訂單明顯、無多餘儀表板

---

## J. LIFF 與身分（待 LINE_SETUP 完成後細化）

### J1 LIFF 初始化失敗
- **Given** LIFF init 失敗
- **Then** 顯示清楚錯誤與 fallback / 重試，不白畫面

### J2 身分伺服器端驗證
- **Given** 建立訂單帶 LIFF `idToken`
- **Then** 後端驗證 idToken 後才寫入 `line_user_id`；不信任前端帶入的 userId

> J 區細節依 `docs/LINE_SETUP.md`（待建立）補完。

---

## 人工 QA 檢查清單

手機（行動優先）：
- [ ] 在窄螢幕（LINE 內建瀏覽器寬度）版面正常，無溢出 / 遮擋
- [ ] 觸控目標夠大
- [ ] 分類標籤可水平捲動
- [ ] 商品卡片圖 / 名 / 價清楚
- [ ] 商品詳情彈窗、數量加減、必填選項正常
- [ ] 購物車修改數量 / 移除正常
- [ ] 結帳步驟 1 / 2 驗證與「上一步」保留資料
- [ ] 完成頁顯示訂單編號與到店付款提醒
- [ ] 載入 / 空 / 錯誤狀態皆有畫面

後台 / 廚房：
- [ ] 今日訂單預設顯示、新訂單醒目
- [ ] 明細資訊完整
- [ ] 狀態更新為明確操作，非單次模糊點擊
- [ ] 非法轉換被拒、取消後仍可在歷史查到
- [ ] 廚房畫面工作距離可讀
- [ ] 廚房畫面以 polling（每 10–15 秒）自動更新，新訂單會出現
- [ ] Admin / 廚房使用單一共用 token，未帶 token 被擋（401）

資料完整性：
- [ ] 伺服器計價，前端竄改價格無效
- [ ] 訂單編號唯一
- [ ] 菜單變更不影響歷史訂單快照
- [ ] Admin API 未驗證被拒
- [ ] 無線上付款 / LINE Pay / 信用卡流程被意外導入

> 自動化測試覆蓋 F、H（API / 狀態機）與 DB（migration / seed / 約束）為主；A–E、G、I 以前端測試 + 人工 QA 覆蓋。
