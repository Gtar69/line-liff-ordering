import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { toMenuDTO } from "@/lib/serializers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const querySchema = z.object({
  category_id: z.string().min(1).optional(),
  q: z.string().optional(),
});

const itemInclude = {
  optionGroups: {
    orderBy: { sortOrder: "asc" as const },
    include: { options: { orderBy: { sortOrder: "asc" as const } } },
  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    category_id: searchParams.get("category_id") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "查詢參數不正確",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            issue: i.message,
          })),
        },
      },
      { status: 400 },
    );
  }

  const store = await prisma.store.findFirst();
  if (!store) {
    return NextResponse.json({ categories: [], items: [] });
  }

  const q = parsed.data.q?.trim();
  const categoryId = parsed.data.category_id;

  const where: Prisma.MenuItemWhereInput = q
    ? // 搜尋套用全部商品，不限分類
      { storeId: store.id, name: { contains: q, mode: "insensitive" } }
    : categoryId
      ? { storeId: store.id, categoryId }
      : { storeId: store.id };

  const [categories, items] = await Promise.all([
    prisma.category.findMany({
      where: { storeId: store.id, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.menuItem.findMany({
      where,
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
      include: itemInclude,
    }),
  ]);

  return NextResponse.json(toMenuDTO(categories, items));
}
