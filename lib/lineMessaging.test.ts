import crypto from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildConfirmationReply,
  formatPickupLabel,
  parseOrderNumber,
  replyMessage,
  verifyLineSignature,
} from "./lineMessaging";

const SECRET = "test-channel-secret";
function sign(body: string, secret = SECRET): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64");
}

describe("verifyLineSignature", () => {
  it("accepts a correct signature", () => {
    const body = '{"events":[]}';
    expect(verifyLineSignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const body = '{"events":[]}';
    expect(verifyLineSignature(body + "x", sign(body), SECRET)).toBe(false);
  });

  it("rejects a null signature", () => {
    expect(verifyLineSignature("{}", null, SECRET)).toBe(false);
  });
});

describe("parseOrderNumber", () => {
  it("extracts a YYYYMMDD-NNNN order number from text", () => {
    expect(parseOrderNumber("我已送出訂單\n訂單編號：20260627-0002")).toBe(
      "20260627-0002",
    );
  });

  it("returns null when no order number present", () => {
    expect(parseOrderNumber("你好，請問營業時間")).toBeNull();
  });
});

describe("formatPickupLabel", () => {
  it("formats a Date as HH:mm in Asia/Taipei", () => {
    // 2026-06-27T07:15:00Z = 15:15 台北時間
    expect(formatPickupLabel(new Date("2026-06-27T07:15:00Z"))).toBe("15:15");
  });
});

describe("buildConfirmationReply", () => {
  it("builds a text message with order number, pickup time and total", () => {
    const msg = buildConfirmationReply({
      orderNumber: "20260627-0002",
      pickupTimeLabel: "15:15",
      total: 75,
    });
    expect(msg.type).toBe("text");
    expect(msg.text).toContain("20260627-0002");
    expect(msg.text).toContain("15:15");
    expect(msg.text).toContain("$75");
    expect(msg.text).toContain("點餐完畢");
  });
});

describe("replyMessage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs replyToken + messages with bearer token", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchSpy);

    await replyMessage("RT", [{ type: "text", text: "hi" }], "ACCESS");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.line.me/v2/bot/message/reply");
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe("Bearer ACCESS");
    expect(JSON.parse(init.body)).toEqual({
      replyToken: "RT",
      messages: [{ type: "text", text: "hi" }],
    });
  });
});
