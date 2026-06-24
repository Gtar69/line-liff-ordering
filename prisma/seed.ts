/**
 * Seed：載入示範菜單（data/menu.sample.json）。
 * 僅供本機 / CI 示範，不得成為正式內容；商家正式菜單以 npm run db:import 匯入自有 JSON。
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { parseMenuFile } from "../lib/menuImport";
import { importMenu } from "../scripts/import-menu";

async function main() {
  const path = process.env.SEED_MENU_FILE ?? "data/menu.sample.json";
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const data = parseMenuFile(raw);

  const prisma = new PrismaClient();
  try {
    const store = await importMenu(prisma, data);
    console.log(`Seed 完成：${store.name}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
