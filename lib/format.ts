/**
 * 金額一律以整數（元）儲存與計算，避免浮點誤差（見 docs/DB_SCHEMA.md）。
 * 此工具僅供顯示用；最終金額以伺服器計算為準。
 */
export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new Error("formatCurrency: amount must be a finite number");
  }
  return `$${Math.round(amount).toLocaleString("zh-TW")}`;
}
