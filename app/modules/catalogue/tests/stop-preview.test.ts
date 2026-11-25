import { describe, expect, it } from "vitest";
import { cancelSubscription, listCustomerSubscriptions } from "~/modules/subscriptions";
import { addProduct, previewStop, stopSelling } from "../index";
import { addVendor } from "./database";
import { eggsWithSubscribers } from "./subscribed-eggs";

describe("previewing a stop", () => {
  it("counts the active Subscriptions stopping a Product would cancel", async () => {
    const { database, karoo, eggs, thandi } = await eggsWithSubscribers();
    const [thandiEggs] = await listCustomerSubscriptions(database, thandi);
    await cancelSubscription(database, thandi, thandiEggs!.id, "2026-11-10");

    expect(await previewStop(database, karoo, { productId: eggs, deliverySchedule: null })).toEqual(
      { productName: "Free-range eggs", deliverySchedule: null, activeSubscriptions: 1 },
    );
  });

  it("counts only those on a Delivery Schedule when stopping it", async () => {
    const { database, karoo, eggs } = await eggsWithSubscribers();
    await addProduct(database, karoo, {
      name: "Duck eggs",
      description: "A dozen.",
      priceCents: 9000,
      deliverySchedules: ["weekly", "monthly"],
    });

    expect(
      await previewStop(database, karoo, { productId: eggs, deliverySchedule: "monthly" }),
    ).toEqual({
      productName: "Free-range eggs",
      deliverySchedule: "monthly",
      activeSubscriptions: 1,
    });
  });

  it("previews stopping the Product when it is the last schedule", async () => {
    const { database, karoo, eggs } = await eggsWithSubscribers();
    await stopSelling(
      database,
      karoo,
      { productId: eggs, deliverySchedule: "weekly" },
      "2026-11-20",
    );

    expect(
      await previewStop(database, karoo, { productId: eggs, deliverySchedule: "monthly" }),
    ).toEqual({ productName: "Free-range eggs", deliverySchedule: null, activeSubscriptions: 1 });
  });

  it("finds nothing to stop that stopSelling would refuse", async () => {
    const { database, karoo, eggs } = await eggsWithSubscribers();
    const otherVendor = await addVendor(database, "Durban Spice Co.", "approved");
    const weekly = { productId: eggs, deliverySchedule: "weekly" } as const;

    expect(await previewStop(database, otherVendor, weekly)).toBeNull();
    expect(
      await previewStop(database, karoo, { productId: eggs, deliverySchedule: "every-two-weeks" }),
    ).toBeNull();
    await stopSelling(database, karoo, weekly, "2026-11-20");
    expect(await previewStop(database, karoo, weekly)).toBeNull();
    await stopSelling(database, karoo, { productId: eggs, deliverySchedule: null }, "2026-11-20");
    expect(
      await previewStop(database, karoo, { productId: eggs, deliverySchedule: null }),
    ).toBeNull();
  });
});
