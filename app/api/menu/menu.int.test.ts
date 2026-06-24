import { describe, expect, it } from "vitest";
import { GET } from "./route";

function req(qs = ""): Request {
  return new Request(`http://localhost/api/menu${qs}`);
}

describe("GET /api/menu (integration)", () => {
  it("returns categories and items with nested options", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.categories.length).toBeGreaterThan(0);
    expect(body.items.length).toBeGreaterThan(0);

    const item = body.items[0];
    expect(item).toHaveProperty("category_id");
    expect(item).toHaveProperty("is_available");
    expect(item).toHaveProperty("option_groups");

    const withGroup = body.items.find(
      (i: { option_groups: unknown[] }) => i.option_groups.length > 0,
    );
    expect(withGroup.option_groups[0]).toHaveProperty("is_required");
    expect(withGroup.option_groups[0].options[0]).toHaveProperty("price_delta");
  });

  it("search applies across all items by name", async () => {
    const res = await GET(req("?q=" + encodeURIComponent("雞")));
    const body = await res.json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(
      body.items.every((i: { name: string }) => i.name.includes("雞")),
    ).toBe(true);
  });

  it("filters by category_id", async () => {
    const all = await (await GET(req())).json();
    const categoryId = all.items[0].category_id;
    const res = await GET(req(`?category_id=${categoryId}`));
    const body = await res.json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(
      body.items.every(
        (i: { category_id: string }) => i.category_id === categoryId,
      ),
    ).toBe(true);
  });

  it("still returns unavailable items (front-end disables them)", async () => {
    const body = await (await GET(req())).json();
    expect(
      body.items.some(
        (i: { is_available: boolean }) => i.is_available === false,
      ),
    ).toBe(true);
  });
});
