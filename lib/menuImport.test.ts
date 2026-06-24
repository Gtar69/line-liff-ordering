import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMenuFile } from "./menuImport";

function baseFile() {
  return {
    store: { name: "測試店", address: null, phone: null },
    menu: {
      categories: [{ id: "c1", name: "炸物", sort_order: 0 }],
      items: [
        {
          id: "i1",
          category_id: "c1",
          name: "鹽酥雞",
          price: 65,
          option_groups: [
            {
              id: "g1",
              name: "辣度",
              is_required: true,
              min_select: 1,
              max_select: 1,
              options: [{ id: "o1", label: "不辣", price_delta: 0 }],
            },
          ],
        },
      ],
    },
  };
}

describe("parseMenuFile", () => {
  it("parses the shipped sample file", () => {
    const raw = JSON.parse(readFileSync("data/menu.sample.json", "utf-8"));
    const data = parseMenuFile(raw);
    expect(data.store.name).toBeTruthy();
    expect(data.menu.categories.length).toBeGreaterThan(0);
    expect(data.menu.items.length).toBeGreaterThan(0);
  });

  it("applies defaults for optional fields", () => {
    const data = parseMenuFile(baseFile());
    const item = data.menu.items[0];
    expect(item.is_available).toBe(true);
    expect(item.description).toBeNull();
    expect(item.option_groups[0].options[0].price_delta).toBe(0);
  });

  it("rejects negative price", () => {
    const f = baseFile();
    f.menu.items[0].price = -1;
    expect(() => parseMenuFile(f)).toThrow();
  });

  it("rejects min_select > max_select", () => {
    const f = baseFile();
    f.menu.items[0].option_groups[0].min_select = 2;
    f.menu.items[0].option_groups[0].max_select = 1;
    expect(() => parseMenuFile(f)).toThrow();
  });

  it("rejects required group with min_select 0", () => {
    const f = baseFile();
    f.menu.items[0].option_groups[0].is_required = true;
    f.menu.items[0].option_groups[0].min_select = 0;
    expect(() => parseMenuFile(f)).toThrow();
  });

  it("rejects item referencing unknown category", () => {
    const f = baseFile();
    f.menu.items[0].category_id = "nope";
    expect(() => parseMenuFile(f)).toThrow();
  });
});
