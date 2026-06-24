import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toStoreDTO } from "@/lib/serializers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const store = await prisma.store.findFirst();
  if (!store) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "store 尚未設定" } },
      { status: 404 },
    );
  }
  return NextResponse.json(toStoreDTO(store));
}
