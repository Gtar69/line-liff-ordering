-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'preparing', 'ready', 'picked_up', 'cancelled');

-- CreateEnum
CREATE TYPE "PickupMethod" AS ENUM ('self_pickup');

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "address" VARCHAR(255),
    "phone" VARCHAR(50),
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Taipei',
    "pickup_lead_minutes" INTEGER NOT NULL DEFAULT 15,
    "pickup_interval_minutes" INTEGER NOT NULL DEFAULT 15,
    "business_hours" JSONB,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "price" INTEGER NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_groups" (
    "id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "min_select" INTEGER NOT NULL DEFAULT 0,
    "max_select" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "option_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "options" (
    "id" UUID NOT NULL,
    "option_group_id" UUID NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "price_delta" INTEGER NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "order_number" VARCHAR(30) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "pickup_method" "PickupMethod" NOT NULL DEFAULT 'self_pickup',
    "pickup_time" TIMESTAMPTZ(6) NOT NULL,
    "customer_name" VARCHAR(100) NOT NULL,
    "customer_phone" VARCHAR(30) NOT NULL,
    "note" VARCHAR(200),
    "subtotal" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "line_user_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "menu_item_id" UUID,
    "name_snapshot" VARCHAR(150) NOT NULL,
    "unit_price_snapshot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_options" (
    "id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "group_name_snapshot" VARCHAR(100) NOT NULL,
    "option_label_snapshot" VARCHAR(100) NOT NULL,
    "price_delta_snapshot" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_item_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "changed_by" VARCHAR(100),
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_store_id_sort_order_idx" ON "categories"("store_id", "sort_order");

-- CreateIndex
CREATE INDEX "menu_items_store_id_category_id_sort_order_idx" ON "menu_items"("store_id", "category_id", "sort_order");

-- CreateIndex
CREATE INDEX "menu_items_name_idx" ON "menu_items"("name");

-- CreateIndex
CREATE INDEX "option_groups_menu_item_id_sort_order_idx" ON "option_groups"("menu_item_id", "sort_order");

-- CreateIndex
CREATE INDEX "options_option_group_id_sort_order_idx" ON "options"("option_group_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_store_id_created_at_idx" ON "orders"("store_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_store_id_status_idx" ON "orders"("store_id", "status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_item_options_order_item_id_idx" ON "order_item_options"("order_item_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_changed_at_idx" ON "order_status_history"("order_id", "changed_at");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_groups" ADD CONSTRAINT "option_groups_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_option_group_id_fkey" FOREIGN KEY ("option_group_id") REFERENCES "option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_options" ADD CONSTRAINT "order_item_options_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK constraints（對應 docs/DB_SCHEMA.md：金額 >= 0、數量 1..99、選項規則）
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_price_nonneg" CHECK ("price" >= 0);
ALTER TABLE "options" ADD CONSTRAINT "options_price_delta_nonneg" CHECK ("price_delta" >= 0);
ALTER TABLE "option_groups" ADD CONSTRAINT "option_groups_min_le_max" CHECK ("min_select" <= "max_select");
ALTER TABLE "option_groups" ADD CONSTRAINT "option_groups_required_min" CHECK ("is_required" = false OR "min_select" >= 1);
ALTER TABLE "orders" ADD CONSTRAINT "orders_subtotal_nonneg" CHECK ("subtotal" >= 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_nonneg" CHECK ("total" >= 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_range" CHECK ("quantity" >= 1 AND "quantity" <= 99);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unit_price_nonneg" CHECK ("unit_price_snapshot" >= 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_line_total_nonneg" CHECK ("line_total" >= 0);
ALTER TABLE "order_item_options" ADD CONSTRAINT "order_item_options_price_delta_nonneg" CHECK ("price_delta_snapshot" >= 0);

