/**
 * LINE idToken 驗證（伺服器端，Issue #11）。
 *
 * 依已確認的「可選身分」策略：
 * - 未設定 LINE_LOGIN_CHANNEL_ID（開發 / 尚未接 LINE）→ 回傳 null（匿名下單）。
 * - 有設定則向 LINE 驗證端點驗證 idToken（簽章 / aud / 過期由 LINE 檢查），通過才取出可信的 sub。
 *
 * 安全規則：永不信任前端帶入的 userId / profile；身分只能由此處驗證 idToken 後取得。
 */
const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

export async function verifyIdToken(idToken: string): Promise<string | null> {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) return null; // 尚未設定 → 匿名

  try {
    const res = await fetch(LINE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
    });
    if (!res.ok) return null; // 無效 / 過期 → 匿名

    const data = (await res.json()) as { sub?: unknown; aud?: unknown };
    // 再次確認 aud 對應本 channel
    if (data.aud !== channelId) return null;
    return typeof data.sub === "string" ? data.sub : null;
  } catch {
    return null; // 驗證服務異常時退回匿名，不阻塞下單
  }
}
