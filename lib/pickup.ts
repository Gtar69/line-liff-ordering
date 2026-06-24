/**
 * 取餐時段產生（伺服器端，Issue #4）。
 * 規則：最早 = 現在 + lead 分、每 interval 分一格、僅當天、不超過營業結束時間。
 * 依 docs/PRD.md 與 docs/API.md：時段可配置、不寫死營業假設。
 */
import type { PickupSlot } from "@/lib/types";

export interface PickupConfig {
  leadMinutes: number;
  intervalMinutes: number;
  timezone: string;
  /** 當天最後可取餐時間（時/分），預設 22:00 */
  closeHour: number;
  closeMinute: number;
  /** 安全上限，避免產生過多選項 */
  maxSlots: number;
}

export const DEFAULT_CLOSE_HOUR = 22;
export const DEFAULT_CLOSE_MINUTE = 0;
export const DEFAULT_MAX_SLOTS = 24;

interface TzParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

function tzParts(date: Date, timeZone: string): TzParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  let hour = get("hour");
  if (hour === "24") hour = "00"; // Intl 偶爾回 24:00
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
  };
}

function dateKey(p: TzParts): string {
  return `${p.year}-${p.month}-${p.day}`;
}

export function generatePickupSlots(
  now: Date,
  config: PickupConfig,
): PickupSlot[] {
  const intervalMs = config.intervalMinutes * 60_000;
  const startEpoch = now.getTime() + config.leadMinutes * 60_000;
  // 對齊到下一個 interval 邊界
  const firstEpoch = Math.ceil(startEpoch / intervalMs) * intervalMs;

  const todayKey = dateKey(tzParts(now, config.timezone));
  const closeTotal = config.closeHour * 60 + config.closeMinute;

  const slots: PickupSlot[] = [];
  for (let i = 0; i < 500 && slots.length < config.maxSlots; i++) {
    const t = new Date(firstEpoch + i * intervalMs);
    const p = tzParts(t, config.timezone);
    if (dateKey(p) !== todayKey) break; // 跨到隔天，停止（僅當天）
    const total = Number(p.hour) * 60 + Number(p.minute);
    if (total > closeTotal) break; // 超過營業結束
    slots.push({
      value: t.toISOString(),
      label: `今天 ${p.month}-${p.day} ${p.hour}:${p.minute}`,
    });
  }
  return slots;
}

/** 驗證指定取餐時間是否合法（與 generatePickupSlots 同規則）：未過期、對齊間隔、僅當天、不超過營業結束。 */
export function isPickupSlotValid(
  target: Date,
  now: Date,
  config: Omit<PickupConfig, "maxSlots">,
): boolean {
  if (Number.isNaN(target.getTime())) return false;
  const intervalMs = config.intervalMinutes * 60_000;
  const startEpoch = now.getTime() + config.leadMinutes * 60_000;
  const firstEpoch = Math.ceil(startEpoch / intervalMs) * intervalMs;
  if (target.getTime() < firstEpoch) return false;
  if (target.getTime() % intervalMs !== 0) return false;

  const tp = tzParts(target, config.timezone);
  const np = tzParts(now, config.timezone);
  if (dateKey(tp) !== dateKey(np)) return false;

  const total = Number(tp.hour) * 60 + Number(tp.minute);
  if (total > config.closeHour * 60 + config.closeMinute) return false;
  return true;
}

/** 訂單編號的日期前綴（店家時區），如 20260624。 */
export function storeDatePrefix(date: Date, timezone: string): string {
  const p = tzParts(date, timezone);
  return `${p.year}${p.month}${p.day}`;
}

/** 由 store.businessHours 解析當天營業結束時間（{ "close": "HH:mm" }），否則用預設 22:00。 */
export function resolveClose(businessHours: unknown): {
  hour: number;
  minute: number;
} {
  if (
    businessHours &&
    typeof businessHours === "object" &&
    "close" in businessHours &&
    typeof (businessHours as { close: unknown }).close === "string"
  ) {
    const [h, m] = (businessHours as { close: string }).close
      .split(":")
      .map((v) => Number(v));
    if (Number.isInteger(h) && h >= 0 && h <= 23) {
      return { hour: h, minute: Number.isInteger(m) ? m : 0 };
    }
  }
  return { hour: DEFAULT_CLOSE_HOUR, minute: DEFAULT_CLOSE_MINUTE };
}
