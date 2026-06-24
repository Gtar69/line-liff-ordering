import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 此專案資料夾上層有其他 lockfile；明確指定 root 避免 Next 推斷錯誤。
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
