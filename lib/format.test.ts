import { describe, expect, it } from "vitest";
import { formatCurrency } from "./format";

describe("formatCurrency", () => {
  it("formats an integer amount with a $ prefix", () => {
    expect(formatCurrency(65)).toBe("$65");
  });

  it("adds thousands separators", () => {
    expect(formatCurrency(1234)).toBe("$1,234");
  });

  it("rounds to the nearest integer", () => {
    expect(formatCurrency(65.4)).toBe("$65");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("throws on non-finite input", () => {
    expect(() => formatCurrency(NaN)).toThrow();
  });
});
