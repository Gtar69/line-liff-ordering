import { describe, expect, it } from "vitest";
import { priceLine } from "./orders";
import { OrderError } from "./orderError";

const item = {
  id: "i1",
  name: "鹽酥雞",
  price: 65,
  isAvailable: true,
  optionGroups: [
    {
      id: "g1",
      name: "辣度",
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      options: [
        { id: "o1", label: "小辣", priceDelta: 0 },
        { id: "o2", label: "大辣", priceDelta: 0 },
      ],
    },
    {
      id: "g2",
      name: "加料",
      isRequired: false,
      minSelect: 0,
      maxSelect: 2,
      options: [
        { id: "o3", label: "加蒜頭洋蔥", priceDelta: 10 },
        { id: "o4", label: "加起司粉", priceDelta: 15 },
      ],
    },
  ],
};

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof OrderError ? e.code : "OTHER";
  }
  return undefined;
}

describe("priceLine", () => {
  it("prices unit (excl. options) and line total (incl. options)", () => {
    const r = priceLine(item, 2, ["o1", "o3"]);
    expect(r.unit_price_snapshot).toBe(65); // 不含選項加價
    expect(r.line_total).toBe((65 + 10) * 2); // 含選項加價
    expect(r.options).toHaveLength(2);
    expect(r.name_snapshot).toBe("鹽酥雞");
  });

  it("allows required single-select with zero-delta option", () => {
    const r = priceLine(item, 1, ["o1"]);
    expect(r.line_total).toBe(65);
  });

  it("rejects unavailable item", () => {
    expect(
      codeOf(() => priceLine({ ...item, isAvailable: false }, 1, ["o1"])),
    ).toBe("ITEM_UNAVAILABLE");
  });

  it("rejects missing required option", () => {
    expect(codeOf(() => priceLine(item, 1, []))).toBe(
      "INVALID_OPTION_SELECTION",
    );
  });

  it("rejects option not belonging to the item", () => {
    expect(codeOf(() => priceLine(item, 1, ["o1", "nope"]))).toBe(
      "INVALID_OPTION_SELECTION",
    );
  });

  it("rejects exceeding max_select", () => {
    expect(codeOf(() => priceLine(item, 1, ["o1", "o2"]))).toBe(
      "INVALID_OPTION_SELECTION",
    );
  });

  it("allows up to max_select on a multi-select group", () => {
    const r = priceLine(item, 1, ["o1", "o3", "o4"]);
    expect(r.line_total).toBe(65 + 10 + 15);
  });

  it("rejects quantity over the limit", () => {
    expect(codeOf(() => priceLine(item, 100, ["o1"]))).toBe(
      "ORDER_LIMIT_EXCEEDED",
    );
  });
});
