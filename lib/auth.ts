/**
 * 後台 / 廚房 Admin 驗證（已確認：MVP 單一共用 token）。
 * Authorization: Bearer <ADMIN_API_TOKEN>，token 僅存環境變數、不進前端 bundle。
 */
import { NextResponse } from "next/server";

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export function isAdminAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) return false; // 未設定 token → 一律拒絕（不可公開未驗證的 Admin API）
  const provided = bearerToken(request);
  if (!provided || provided.length !== expected.length) return false;
  // 長度相等時逐字比較（避免過早回傳造成的時間差）
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

export function adminUnauthorized(): NextResponse {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "需要管理員授權" } },
    { status: 401 },
  );
}
