import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/store (integration)", () => {
  it("returns the seeded store DTO", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBeTruthy();
    expect(body.pickup_methods).toEqual(["self_pickup"]);
    expect(typeof body.is_open).toBe("boolean");
  });
});
