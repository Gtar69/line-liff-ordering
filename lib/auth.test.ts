import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAdminAuthorized } from "./auth";

function reqWithAuth(value?: string): Request {
  return new Request("http://localhost/api/admin/orders", {
    headers: value ? { authorization: value } : {},
  });
}

describe("isAdminAuthorized", () => {
  const original = process.env.ADMIN_API_TOKEN;
  beforeEach(() => {
    process.env.ADMIN_API_TOKEN = "secret-token";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_API_TOKEN;
    else process.env.ADMIN_API_TOKEN = original;
  });

  it("accepts the correct bearer token", () => {
    expect(isAdminAuthorized(reqWithAuth("Bearer secret-token"))).toBe(true);
  });

  it("rejects a wrong token", () => {
    expect(isAdminAuthorized(reqWithAuth("Bearer nope"))).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(isAdminAuthorized(reqWithAuth())).toBe(false);
  });

  it("rejects when no token is configured", () => {
    delete process.env.ADMIN_API_TOKEN;
    expect(isAdminAuthorized(reqWithAuth("Bearer secret-token"))).toBe(false);
  });
});
