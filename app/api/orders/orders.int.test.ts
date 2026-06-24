import { beforeAll, describe, expect, it } from "vitest";
import { GET as menuGET } from "../menu/route";
import { GET as pickupGET } from "../pickup-times/route";
import { POST } from "./route";
import { prisma } from "@/lib/db";

interface OptionDTO {
  id: string;
}
interface GroupDTO {
  is_required: boolean;
  options: OptionDTO[];
}
interface ItemDTO {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  option_groups: GroupDTO[];
}

let popcorn: ItemDTO; // 有必填選項群組
let requiredOptionId: string;
let unavailable: ItemDTO;
let slot: string | undefined;

async function loadMenu(): Promise<ItemDTO[]> {
  const res = await menuGET(new Request("http://localhost/api/menu"));
  return (await res.json()).items as ItemDTO[];
}

async function firstSlot(): Promise<string | undefined> {
  const res = await pickupGET();
  const body = await res.json();
  return body.slots[0]?.value as string | undefined;
}

function postReq(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    pickup_method: "self_pickup",
    pickup_time: slot ?? "2026-06-24T17:00:00+08:00",
    customer_name: "王小明",
    customer_phone: "0912345678",
    note: "少鹽",
    items: [
      { menu_item_id: popcorn.id, quantity: 2, option_ids: [requiredOptionId] },
    ],
    ...overrides,
  };
}

beforeAll(async () => {
  const items = await loadMenu();
  popcorn = items.find((i) => i.option_groups.some((g) => g.is_required))!;
  requiredOptionId = popcorn.option_groups.find((g) => g.is_required)!
    .options[0].id;
  unavailable = items.find((i) => !i.is_available)!;
  slot = await firstSlot();
});

describe("POST /api/orders (integration)", () => {
  it("F1: creates a valid order with a unique number", async () => {
    expect(slot, "需要可用取餐時段（與當下時間有關）").toBeDefined();
    const res = await POST(postReq(validBody()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.order_number).toMatch(/^\d{8}-\d{4}$/);
    expect(body.status).toBe("pending");
    expect(body.payment_note).toContain("到店付款");
    expect(body.total).toBe(popcorn.price * 2);
  });

  it("F2: server computes price, ignores client-supplied price", async () => {
    expect(slot).toBeDefined();
    const body = validBody({
      total: 1,
      items: [
        {
          menu_item_id: popcorn.id,
          quantity: 1,
          option_ids: [requiredOptionId],
          price: 1,
          line_total: 1,
        },
      ],
    });
    const res = await POST(postReq(body));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.total).toBe(popcorn.price);
    expect(json.items[0].unit_price).toBe(popcorn.price);
  });

  it("F3: empty cart -> 422 EMPTY_CART", async () => {
    const res = await POST(postReq(validBody({ items: [] })));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("EMPTY_CART");
  });

  it("F4: missing required field -> 400 VALIDATION_ERROR", async () => {
    const body = validBody();
    delete (body as Record<string, unknown>).customer_name;
    const res = await POST(postReq(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("F5: unavailable item -> 422 ITEM_UNAVAILABLE", async () => {
    const res = await POST(
      postReq(
        validBody({
          items: [
            { menu_item_id: unavailable.id, quantity: 1, option_ids: [] },
          ],
        }),
      ),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("ITEM_UNAVAILABLE");
  });

  it("F6: missing required option -> 422 INVALID_OPTION_SELECTION", async () => {
    const res = await POST(
      postReq(
        validBody({
          items: [{ menu_item_id: popcorn.id, quantity: 1, option_ids: [] }],
        }),
      ),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("INVALID_OPTION_SELECTION");
  });

  it("F7: invalid/expired pickup time -> 422 INVALID_PICKUP_TIME", async () => {
    const res = await POST(
      postReq(validBody({ pickup_time: "2020-01-01T00:00:00+08:00" })),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("INVALID_PICKUP_TIME");
  });

  it("F8: note over 200 chars -> 400 VALIDATION_ERROR", async () => {
    const res = await POST(postReq(validBody({ note: "x".repeat(201) })));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("F12: quantity over limit -> 422 ORDER_LIMIT_EXCEEDED", async () => {
    const res = await POST(
      postReq(
        validBody({
          items: [
            {
              menu_item_id: popcorn.id,
              quantity: 100,
              option_ids: [requiredOptionId],
            },
          ],
        }),
      ),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("ORDER_LIMIT_EXCEEDED");
  });

  it("F9: concurrent orders get unique numbers", async () => {
    expect(slot).toBeDefined();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => POST(postReq(validBody()))),
    );
    const numbers: string[] = [];
    for (const res of results) {
      expect(res.status).toBe(201);
      numbers.push((await res.json()).order_number);
    }
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("F10: snapshot is stable when menu price later changes", async () => {
    expect(slot).toBeDefined();
    const res = await POST(postReq(validBody()));
    const body = await res.json();
    const snapshotUnit = body.items[0].unit_price;

    const original = await prisma.menuItem.findUniqueOrThrow({
      where: { id: popcorn.id },
    });
    await prisma.menuItem.update({
      where: { id: popcorn.id },
      data: { price: original.price + 100 },
    });
    try {
      const stored = await prisma.order.findFirstOrThrow({
        where: { orderNumber: body.order_number },
        include: { items: true },
      });
      expect(stored.items[0].unitPriceSnapshot).toBe(snapshotUnit);
    } finally {
      await prisma.menuItem.update({
        where: { id: popcorn.id },
        data: { price: original.price },
      });
    }
  });

  it("F11: store closed -> 422 STORE_CLOSED", async () => {
    const store = await prisma.store.findFirstOrThrow();
    await prisma.store.update({
      where: { id: store.id },
      data: { isOpen: false },
    });
    try {
      const res = await POST(postReq(validBody()));
      expect(res.status).toBe(422);
      expect((await res.json()).error.code).toBe("STORE_CLOSED");
    } finally {
      await prisma.store.update({
        where: { id: store.id },
        data: { isOpen: true },
      });
    }
  });

  it("F13: anonymous order is allowed, line_user_id stays null", async () => {
    expect(slot).toBeDefined();
    const res = await POST(
      postReq(validBody(), { authorization: "Bearer fake-id-token" }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    const stored = await prisma.order.findFirstOrThrow({
      where: { orderNumber: body.order_number },
    });
    expect(stored.lineUserId).toBeNull();
  });

  it("G2: same Idempotency-Key returns the same order, no duplicate", async () => {
    expect(slot).toBeDefined();
    const key = `it-key-${slot}`;
    const first = await POST(postReq(validBody(), { "Idempotency-Key": key }));
    expect(first.status).toBe(201);
    const firstBody = await first.json();

    const second = await POST(postReq(validBody(), { "Idempotency-Key": key }));
    expect(second.status).toBe(200);
    const secondBody = await second.json();

    expect(secondBody.order_number).toBe(firstBody.order_number);
    const count = await prisma.order.count({
      where: { idempotencyKey: key },
    });
    expect(count).toBe(1);
  });
});
