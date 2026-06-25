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

/** 將 ISO 時間以店家時區（Asia/Taipei）格式化為 MM/DD HH:mm，供後台 / 廚房顯示。 */
export function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
