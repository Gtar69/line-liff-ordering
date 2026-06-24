/**
 * 時區相關工具：以店家時區計算「今日」範圍，供後台訂單列表使用。
 */

/** 指定時刻在某時區相對 UTC 的偏移分鐘數（時區比 UTC 早多少分鐘）。 */
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
  const hour = map.hour === "24" ? "00" : map.hour;
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(hour),
    Number(map.minute),
    Number(map.second),
  );
  return (asUTC - date.getTime()) / 60000;
}

/** 取得某時區「今天」的日期字串 YYYY-MM-DD。 */
export function todayInTz(timeZone: string, now: Date = new Date()): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA 產生 YYYY-MM-DD
  return dtf.format(now);
}

/** 將「某時區某日 00:00」起算的一整天，換算成 UTC 的 [start, end) Date 區間。 */
export function dayRangeInTz(
  dateStr: string,
  timeZone: string,
): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcGuess = Date.UTC(y, m - 1, d, 0, 0, 0);
  const offset = tzOffsetMinutes(new Date(utcGuess), timeZone);
  const start = new Date(utcGuess - offset * 60000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
