import { describe, expect, it } from "vitest";
import { canTransition, isOrderStatus } from "./orderStatus";

describe("canTransition", () => {
  it("allows the MVP transitions", () => {
    expect(canTransition("pending", "preparing")).toBe(true);
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("preparing", "ready")).toBe(true);
    expect(canTransition("preparing", "cancelled")).toBe(true);
    expect(canTransition("ready", "picked_up")).toBe(true);
    expect(canTransition("ready", "cancelled")).toBe(true);
  });

  it("rejects skipping states", () => {
    expect(canTransition("pending", "ready")).toBe(false);
    expect(canTransition("pending", "picked_up")).toBe(false);
    expect(canTransition("preparing", "picked_up")).toBe(false);
  });

  it("treats picked_up and cancelled as terminal", () => {
    expect(canTransition("picked_up", "ready")).toBe(false);
    expect(canTransition("cancelled", "pending")).toBe(false);
  });

  it("validates status strings", () => {
    expect(isOrderStatus("pending")).toBe(true);
    expect(isOrderStatus("nope")).toBe(false);
  });
});
