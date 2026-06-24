-- Issue #5：訂單建立冪等性（對應 ACCEPTANCE G2）
ALTER TABLE "orders" ADD COLUMN "idempotency_key" VARCHAR(100);

-- nullable + unique：未帶 key 的訂單可有多筆（Postgres 允許多個 NULL）；帶 key 則唯一
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");
