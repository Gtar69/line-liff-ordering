/**
 * Seed 後的關聯完整性檢查（CI 用）。
 * 確認 store / categories / menu_items / option_groups / options 都有資料且關聯正確。
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const [stores, categories, items, groups, options] = await Promise.all([
      prisma.store.count(),
      prisma.category.count(),
      prisma.menuItem.count(),
      prisma.optionGroup.count(),
      prisma.option.count(),
    ]);

    const checks: [string, boolean][] = [
      ["單一 store", stores === 1],
      ["categories > 0", categories > 0],
      ["menu_items > 0", items > 0],
      ["option_groups > 0", groups > 0],
      ["options > 0", options > 0],
    ];

    // 關聯：每個 option_group 至少有一個 option，且都指向存在的 menu_item
    const groupsWithItem = await prisma.optionGroup.findMany({
      include: { options: true, menuItem: true },
    });
    const relationsOk = groupsWithItem.every(
      (g) => g.options.length > 0 && g.menuItem != null,
    );
    checks.push(["option_groups 關聯完整", relationsOk]);

    let failed = false;
    for (const [label, ok] of checks) {
      console.log(`${ok ? "✓" : "✗"} ${label}`);
      if (!ok) failed = true;
    }
    console.log(
      `\nstores=${stores} categories=${categories} items=${items} groups=${groups} options=${options}`,
    );

    if (failed) {
      console.error("Seed 完整性檢查失敗");
      process.exit(1);
    }
    console.log("Seed 完整性檢查通過");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
