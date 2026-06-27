import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "wh-secret";
const TOKEN = "wh-token";

vi.mock("@/lib/db", () => ({
  prisma: { order: { findUnique: vi.fn() } },
}));

import { prisma } from "@/lib/db";
import { POST } from "./route";

const findUnique = prisma.order.findUnique as ReturnType<typeof vi.fn>;

function sign(body: string): string {
  return crypto.createHmac("sha256", SECRET).update(body).digest("base64");
}
function req(body: string, signature: string | null): Request {
  return new Request("https://x/api/line/webhook", {
    method: "POST",
    headers: signature ? { "x-line-signature": signature } : {},
    body,
  });
}

describe("POST /api/line/webhook", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    process.env.LINE_MESSAGING_CHANNEL_SECRET = SECRET;
    process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN = TOKEN;
    fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchSpy);
    findUnique.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LINE_MESSAGING_CHANNEL_SECRET;
    delete process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  });

  it("replies when a known order message arrives with valid signature", async () => {
    findUnique.mockResolvedValue({
      orderNumber: "20260627-0002",
      pickupTime: new Date("2026-06-27T07:15:00Z"),
      total: 75,
    });
    const body = JSON.stringify({
      events: [
        {
          type: "message",
          replyToken: "RT",
          message: { type: "text", text: "訂單編號：20260627-0002" },
        },
      ],
    });
    const res = await POST(req(body, sign(body)));
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const init = fetchSpy.mock.calls[0][1];
    expect(JSON.parse(init.body).replyToken).toBe("RT");
  });

  it("returns 401 on bad signature and does not reply", async () => {
    const body = JSON.stringify({ events: [] });
    const res = await POST(req(body, "wrong"));
    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 200 and no reply for non-order text", async () => {
    const body = JSON.stringify({
      events: [
        {
          type: "message",
          replyToken: "RT",
          message: { type: "text", text: "你好" },
        },
      ],
    });
    const res = await POST(req(body, sign(body)));
    expect(res.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 200 and no reply when order not found", async () => {
    findUnique.mockResolvedValue(null);
    const body = JSON.stringify({
      events: [
        {
          type: "message",
          replyToken: "RT",
          message: { type: "text", text: "訂單編號：20260627-9999" },
        },
      ],
    });
    const res = await POST(req(body, sign(body)));
    expect(res.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
