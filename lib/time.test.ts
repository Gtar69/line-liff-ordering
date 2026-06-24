import { describe, expect, it } from "vitest";
import { dayRangeInTz, todayInTz } from "./time";

describe("todayInTz", () => {
  it("rolls to the next day in a +8 timezone", () => {
    const now = new Date("2026-06-24T20:00:00Z"); // Taipei 04:00 隔天
    expect(todayInTz("Asia/Taipei", now)).toBe("2026-06-25");
    expect(todayInTz("UTC", now)).toBe("2026-06-24");
  });
});

describe("dayRangeInTz", () => {
  it("maps a Taipei day to the correct UTC window", () => {
    const { start, end } = dayRangeInTz("2026-06-24", "Asia/Taipei");
    expect(start.toISOString()).toBe("2026-06-23T16:00:00.000Z");
    expect(end.toISOString()).toBe("2026-06-24T16:00:00.000Z");
  });
});
