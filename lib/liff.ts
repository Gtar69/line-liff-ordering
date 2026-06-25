/**
 * 客人端 LINE LIFF 包裝（Issue #11）。
 * - 未設定 NEXT_PUBLIC_LIFF_ID（開發 / 非 LIFF 環境）→ 略過初始化，採匿名下單。
 * - 有設定則 liff.init()，未登入時導向 LINE 登入，建立訂單時夾帶 idToken。
 *
 * 注意：@line/liff 僅能在瀏覽器環境使用，故此模組只在 client component 中匯入。
 */
import liff from "@line/liff";

let initPromise: Promise<void> | null = null;

export function isLiffConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_LIFF_ID);
}

export async function initLiff(): Promise<void> {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) return; // 非 LIFF / 開發環境
  if (!initPromise) {
    initPromise = liff.init({ liffId });
  }
  await initPromise;
}

/** 若在 LIFF 內且尚未登入，導向 LINE 登入（會離開頁面）。 */
export function ensureLogin(): void {
  if (!isLiffConfigured()) return;
  try {
    if (!liff.isLoggedIn()) liff.login();
  } catch {
    // 非 LIFF 環境下忽略
  }
}

/** 取得 idToken（建立訂單時夾帶）；取不到則回 null（匿名）。 */
export function getIdToken(): string | null {
  if (!isLiffConfigured()) return null;
  try {
    return liff.getIDToken();
  } catch {
    return null;
  }
}
