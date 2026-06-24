import { describe, expect, it } from "vitest";
import {
  generatePickupSlots,
  isPickupSlotValid,
  type PickupConfig,
} from "./pickup";

const cfg: PickupConfig = {
  leadMinutes: 15,
  intervalMinutes: 15,
  timezone: "Asia/Taipei",
  closeHour: 22,
  closeMinute: 0,
  maxSlots: 24,
};

describe("generatePickupSlots", () => {
  it("earliest slot is now + lead, aligned to interval", () => {
    const now = new Date("2026-06-24T08:00:00+08:00");
    const slots = generatePickupSlots(now, cfg);
    expect(slots[0].label).toBe("今天 06-24 08:15");
  });

  it("rounds the first slot up to the next interval boundary", () => {
    const now = new Date("2026-06-24T08:05:00+08:00");
    const slots = generatePickupSlots(now, cfg);
    // 08:05 + 15 = 08:20 → 對齊到 08:30
    expect(slots[0].label).toBe("今天 06-24 08:30");
  });

  it("steps by the interval", () => {
    const now = new Date("2026-06-24T08:00:00+08:00");
    const slots = generatePickupSlots(now, cfg);
    expect(slots[1].label).toBe("今天 06-24 08:30");
    expect(slots[2].label).toBe("今天 06-24 08:45");
  });

  it("does not exceed close time", () => {
    const now = new Date("2026-06-24T21:30:00+08:00");
    const slots = generatePickupSlots(now, cfg);
    // earliest 21:45, then 22:00 (== close, allowed), then stop
    expect(slots.map((s) => s.label)).toEqual([
      "今天 06-24 21:45",
      "今天 06-24 22:00",
    ]);
  });

  it("returns empty when past close", () => {
    const now = new Date("2026-06-24T22:30:00+08:00");
    const slots = generatePickupSlots(now, cfg);
    expect(slots).toHaveLength(0);
  });

  it("stays within the same day (does not roll into tomorrow)", () => {
    const now = new Date("2026-06-24T08:00:00+08:00");
    const slots = generatePickupSlots(now, { ...cfg, maxSlots: 100 });
    expect(slots.every((s) => s.label.startsWith("今天 06-24"))).toBe(true);
  });

  it("respects maxSlots", () => {
    const now = new Date("2026-06-24T08:00:00+08:00");
    const slots = generatePickupSlots(now, { ...cfg, maxSlots: 3 });
    expect(slots).toHaveLength(3);
  });
});

describe("isPickupSlotValid", () => {
  const now = new Date("2026-06-24T08:00:00+08:00");

  it("accepts a valid aligned future slot today", () => {
    const target = new Date("2026-06-24T08:30:00+08:00");
    expect(isPickupSlotValid(target, now, cfg)).toBe(true);
  });

  it("rejects a past time", () => {
    const target = new Date("2026-06-24T08:00:00+08:00");
    expect(isPickupSlotValid(target, now, cfg)).toBe(false);
  });

  it("rejects a time before now + lead", () => {
    const target = new Date("2026-06-24T08:10:00+08:00");
    expect(isPickupSlotValid(target, now, cfg)).toBe(false);
  });

  it("rejects a misaligned time", () => {
    const target = new Date("2026-06-24T08:37:00+08:00");
    expect(isPickupSlotValid(target, now, cfg)).toBe(false);
  });

  it("rejects a time after close", () => {
    const target = new Date("2026-06-24T22:30:00+08:00");
    expect(isPickupSlotValid(target, now, cfg)).toBe(false);
  });

  it("rejects a slot on a different day", () => {
    const target = new Date("2026-06-25T12:00:00+08:00");
    expect(isPickupSlotValid(target, now, cfg)).toBe(false);
  });

  it("rejects an invalid date", () => {
    expect(isPickupSlotValid(new Date("nope"), now, cfg)).toBe(false);
  });
});
