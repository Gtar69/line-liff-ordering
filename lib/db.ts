import { PrismaClient } from "@prisma/client";

/** Prisma client singleton（避免開發熱重載時建立多個連線）。 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
