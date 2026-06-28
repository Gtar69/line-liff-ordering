import { afterEach, describe, expect, it } from "vitest";
import { sendOrderMessage } from "./liff";

describe("sendOrderMessage", () => {
  const original = process.env.NEXT_PUBLIC_LIFF_ID;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_LIFF_ID;
    else process.env.NEXT_PUBLIC_LIFF_ID = original;
  });

  it("no-ops (no throw) when LIFF is not configured", async () => {
    delete process.env.NEXT_PUBLIC_LIFF_ID;
    await expect(
      sendOrderMessage({ orderNumber: "20260627-0002" }),
    ).resolves.toBeUndefined();
  });
});
