import { describe, expect, it } from "vitest";
import { GET as listGET } from "./route";
import { GET as detailGET } from "./[id]/route";
import { PATCH as statusPATCH } from "./[id]/status/route";
import { prisma } from "@/lib/db";
import type { OrderStatusValue } from "@/lib/orderStatus";

const TOKEN = process.env.ADMIN_API_TOKEN ?? "test-admin-token";

function authReq(url: string): Request {
  return new Request(url, { headers: { authorization: `Bearer ${TOKEN}` } });
}
function patchReq(url: string, body: unknown): Request {
  return new Request(url, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

let seq = 0;
async function makeOrder(status: OrderStatusValue = "pending") {
  const store = await prisma.store.findFirstOrThrow();
  seq += 1;
  const orderNumber = `ADM-${Date.now()}-${seq}`.slice(0, 30);
  return prisma.order.create({
    data: {
      storeId: store.id,
      orderNumber,
      status,
      pickupMethod: "self_pickup",
      pickupTime: new Date(),
      customerName: "測試客",
      customerPhone: "0900000000",
      subtotal: 130,
      total: 130,
      items: {
        create: {
          nameSnapshot: "鹽酥雞",
          unitPriceSnapshot: 65,
          quantity: 2,
          lineTotal: 130,
          options: {
            create: {
              groupNameSnapshot: "辣度",
              optionLabelSnapshot: "小辣",
              priceDeltaSnapshot: 0,
            },
          },
        },
      },
      statusHistory: { create: { fromStatus: null, toStatus: status } },
    },
  });
}

describe("Admin orders API (integration)", () => {
  it("H8: unauthenticated requests are rejected with 401", async () => {
    const list = await listGET(
      new Request("http://localhost/api/admin/orders"),
    );
    expect(list.status).toBe(401);
    const detail = await detailGET(
      new Request("http://localhost/api/admin/orders/x"),
      params("x"),
    );
    expect(detail.status).toBe(401);
    const patch = await statusPATCH(
      new Request("http://localhost/api/admin/orders/x/status", {
        method: "PATCH",
      }),
      params("x"),
    );
    expect(patch.status).toBe(401);
  });

  it("H1: lists today's orders with summary fields", async () => {
    const order = await makeOrder("pending");
    const res = await listGET(authReq("http://localhost/api/admin/orders"));
    expect(res.status).toBe(200);
    const body = await res.json();
    const found = body.orders.find(
      (o: { order_number: string }) => o.order_number === order.orderNumber,
    );
    expect(found).toBeDefined();
    expect(found.item_count).toBe(1);
    expect(found.items_summary).toContain("鹽酥雞");
    expect(found.total).toBe(130);
  });

  it("I1: kitchen scope only returns pending/preparing", async () => {
    await makeOrder("ready");
    const res = await listGET(
      authReq("http://localhost/api/admin/orders?scope=kitchen"),
    );
    const body = await res.json();
    expect(
      body.orders.every((o: { status: string }) =>
        ["pending", "preparing"].includes(o.status),
      ),
    ).toBe(true);
  });

  it("H3: detail returns items, options and status history", async () => {
    const order = await makeOrder("pending");
    const res = await detailGET(
      authReq(`http://localhost/api/admin/orders/${order.id}`),
      params(order.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.order_number).toBe(order.orderNumber);
    expect(body.items[0].options[0].label).toBe("小辣");
    expect(body.status_history.length).toBeGreaterThanOrEqual(1);
  });

  it("H4: valid transition succeeds and records history", async () => {
    const order = await makeOrder("pending");
    const res = await statusPATCH(
      patchReq(`http://localhost/api/admin/orders/${order.id}/status`, {
        to_status: "preparing",
        expected_current_status: "pending",
      }),
      params(order.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("preparing");
    expect(body.status_history.at(-1).to_status).toBe("preparing");
  });

  it("H5: illegal transition is rejected with 409", async () => {
    const order = await makeOrder("pending");
    const res = await statusPATCH(
      patchReq(`http://localhost/api/admin/orders/${order.id}/status`, {
        to_status: "ready",
      }),
      params(order.id),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("INVALID_STATUS_TRANSITION");
    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(after.status).toBe("pending");
  });

  it("H6: cancelling keeps the order retrievable", async () => {
    const order = await makeOrder("ready");
    const res = await statusPATCH(
      patchReq(`http://localhost/api/admin/orders/${order.id}/status`, {
        to_status: "cancelled",
      }),
      params(order.id),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("cancelled");
    const detail = await detailGET(
      authReq(`http://localhost/api/admin/orders/${order.id}`),
      params(order.id),
    );
    expect((await detail.json()).status).toBe("cancelled");
  });

  it("H7: stale expected_current_status -> 409 ORDER_CONFLICT", async () => {
    const order = await makeOrder("pending");
    const first = await statusPATCH(
      patchReq(`http://localhost/api/admin/orders/${order.id}/status`, {
        to_status: "preparing",
        expected_current_status: "pending",
      }),
      params(order.id),
    );
    expect(first.status).toBe(200);

    const second = await statusPATCH(
      patchReq(`http://localhost/api/admin/orders/${order.id}/status`, {
        to_status: "preparing",
        expected_current_status: "pending",
      }),
      params(order.id),
    );
    expect(second.status).toBe(409);
    expect((await second.json()).error.code).toBe("ORDER_CONFLICT");
  });
});
