/**
 * 菜單匯入 CLI / 函式（Issue #3）。
 * 用法：npm run db:import -- <path-to-json>（預設 data/menu.sample.json）
 * 將商家菜單寫入 DB；單店單門市，會重置該店現有菜單後重建（不影響 orders）。
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { parseMenuFile, type MenuFile } from "../lib/menuImport";

export async function importMenu(prisma: PrismaClient, data: MenuFile) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.store.findFirst();
    const storeData = {
      name: data.store.name,
      address: data.store.address,
      phone: data.store.phone,
      timezone: data.store.timezone,
      isOpen: data.store.is_open,
      businessHours: data.store.business_hours ?? undefined,
    };
    const store = existing
      ? await tx.store.update({ where: { id: existing.id }, data: storeData })
      : await tx.store.create({ data: storeData });

    // 重置此店菜單（cascade 會清掉 menu_items / option_groups / options）
    await tx.category.deleteMany({ where: { storeId: store.id } });

    const categoryIdMap = new Map<string, string>();
    for (const c of data.menu.categories) {
      const created = await tx.category.create({
        data: {
          storeId: store.id,
          name: c.name,
          sortOrder: c.sort_order,
          isActive: c.is_active,
        },
      });
      categoryIdMap.set(c.id, created.id);
    }

    for (const item of data.menu.items) {
      const categoryId = categoryIdMap.get(item.category_id);
      if (!categoryId) {
        throw new Error(`找不到 item「${item.id}」對應的分類`);
      }
      const createdItem = await tx.menuItem.create({
        data: {
          storeId: store.id,
          categoryId,
          name: item.name,
          description: item.description,
          imageUrl: item.image_url,
          price: item.price,
          isAvailable: item.is_available,
          sortOrder: item.sort_order,
        },
      });
      for (const group of item.option_groups) {
        const createdGroup = await tx.optionGroup.create({
          data: {
            menuItemId: createdItem.id,
            name: group.name,
            isRequired: group.is_required,
            minSelect: group.min_select,
            maxSelect: group.max_select,
            sortOrder: group.sort_order,
          },
        });
        for (const opt of group.options) {
          await tx.option.create({
            data: {
              optionGroupId: createdGroup.id,
              label: opt.label,
              priceDelta: opt.price_delta,
              isAvailable: opt.is_available,
              sortOrder: opt.sort_order,
            },
          });
        }
      }
    }

    return store;
  });
}

async function main() {
  const path = process.argv[2] ?? "data/menu.sample.json";
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const data = parseMenuFile(raw);
  const prisma = new PrismaClient();
  try {
    const store = await importMenu(prisma, data);
    console.log(
      `已匯入菜單：「${store.name}」，分類 ${data.menu.categories.length}、商品 ${data.menu.items.length}（來源：${path}）`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
