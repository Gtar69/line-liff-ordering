import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/pickup-times (integration)", () => {
  it("returns a slots array of { value, label }", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.slots)).toBe(true);
    // 時段數量取決於當下時間（可能為空，例如打烊後），故只驗證形狀。
    for (const slot of body.slots) {
      expect(typeof slot.value).toBe("string");
      expect(Number.isNaN(Date.parse(slot.value))).toBe(false);
      expect(slot.label.startsWith("今天")).toBe(true);
    }
  });
});
