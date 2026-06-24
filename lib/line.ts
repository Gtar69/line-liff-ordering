/**
 * LINE idToken 驗證（伺服器端）。
 *
 * Issue #5 先放 stub：尚未串接 LINE（資源未建立，見 docs/LINE_SETUP.md）。
 * 依已確認的「可選身分」策略，目前一律回傳 null（匿名下單），訂單不寫入 line_user_id。
 * Issue #11 會以真實的 LINE token 驗證端點取代（檢查簽章、aud、過期）。
 *
 * 安全規則：永不信任前端帶入的 userId / profile；身分只能由後端驗證 idToken 後取得。
 */
export async function verifyIdToken(_idToken: string): Promise<string | null> {
  // TODO(#11): 呼叫 https://api.line.me/oauth2/v2.1/verify 驗證並取出 sub。
  return null;
}
