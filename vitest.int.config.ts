import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** 整合測試（需 DATABASE_URL 連到 Postgres）。於 CI 的 db job 執行。 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.int.test.ts"],
    exclude: ["node_modules", ".next"],
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
