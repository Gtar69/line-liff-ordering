import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyIdToken } from "./line";

const CHANNEL = "1234567890";

function mockFetch(response: { ok: boolean; body?: Record<string, unknown> }) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    json: async () => response.body ?? {},
  });
}

describe("verifyIdToken", () => {
  const original = process.env.LINE_LOGIN_CHANNEL_ID;
  beforeEach(() => {
    process.env.LINE_LOGIN_CHANNEL_ID = CHANNEL;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.LINE_LOGIN_CHANNEL_ID;
    else process.env.LINE_LOGIN_CHANNEL_ID = original;
    vi.unstubAllGlobals();
  });

  it("returns the sub when the token is valid and aud matches", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ ok: true, body: { sub: "U_abc", aud: CHANNEL } }),
    );
    expect(await verifyIdToken("token")).toBe("U_abc");
  });

  it("returns null when aud does not match the channel", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ ok: true, body: { sub: "U_abc", aud: "other" } }),
    );
    expect(await verifyIdToken("token")).toBeNull();
  });

  it("returns null when LINE rejects the token", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false }));
    expect(await verifyIdToken("token")).toBeNull();
  });

  it("returns null (anonymous) when no channel is configured, without calling LINE", async () => {
    delete process.env.LINE_LOGIN_CHANNEL_ID;
    const fetchSpy = mockFetch({ ok: true, body: { sub: "x", aud: CHANNEL } });
    vi.stubGlobal("fetch", fetchSpy);
    expect(await verifyIdToken("token")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null when the verify request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await verifyIdToken("token")).toBeNull();
  });
});
