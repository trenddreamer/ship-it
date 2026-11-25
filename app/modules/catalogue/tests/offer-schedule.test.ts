import { describe, expect, it } from "vitest";
import { findSubscribableProduct, subscribe } from "~/modules/subscriptions";
import {
  findVendorProduct,
  offerDeliverySchedule,
  offerScheduleSchema,
  stopSelling,
} from "../index";
import { addCustomer, addVendor } from "./database";
import { eggsWithSubscriptions } from "./subscribed-eggs";

describe("offering a Delivery Schedule again", () => {
  it("adds a Delivery Schedule to one of the Vendor's Products", async () => {
    const { database, karoo, eggs } = await eggsWithSubscriptions();

    const result = await offerDeliverySchedule(database, karoo, {
      productId: eggs,
      deliverySchedule: "every-two-weeks",
    });

    expect(result).toEqual({ ok: true });
    expect((await findVendorProduct(database, karoo, eggs))?.deliverySchedules).toEqual([
      "weekly",
      "every-two-weeks",
      "monthly",
    ]);
  });

  it("brings back a schedule the Vendor stopped, for Customers to subscribe on again", async () => {
    const { database, karoo, eggs } = await eggsWithSubscriptions();
    await stopSelling(
      database,
      karoo,
      { productId: eggs, deliverySchedule: "weekly" },
      "2026-11-20",
    );

    await offerDeliverySchedule(database, karoo, { productId: eggs, deliverySchedule: "weekly" });

    expect((await findSubscribableProduct(database, eggs))?.deliverySchedules).toEqual([
      "weekly",
      "monthly",
    ]);
    const naledi = await addCustomer(database, "naledi@example.test");
    expect(
      await subscribe(
        database,
        naledi,
        { productId: eggs, deliverySchedule: "weekly" },
        "2026-11-21",
      ),
    ).toEqual({ ok: true });
  });

  it("refuses a Delivery Schedule the Product already offers", async () => {
    const { database, karoo, eggs } = await eggsWithSubscriptions();

    expect(
      await offerDeliverySchedule(database, karoo, { productId: eggs, deliverySchedule: "weekly" }),
    ).toEqual({ ok: false, error: "already-offered" });
  });

  it("refuses another Vendor's Product, and a Product the Vendor stopped selling", async () => {
    const { database, karoo, eggs } = await eggsWithSubscriptions();
    const other = await addVendor(database, "Other Farm", "approved");
    const schedule = { productId: eggs, deliverySchedule: "every-two-weeks" } as const;

    expect(await offerDeliverySchedule(database, other, schedule)).toEqual({
      ok: false,
      error: "product-not-found",
    });

    await stopSelling(database, karoo, { productId: eggs, deliverySchedule: null }, "2026-11-20");
    expect(await offerDeliverySchedule(database, karoo, schedule)).toEqual({
      ok: false,
      error: "product-not-found",
    });
  });
});

describe("offerScheduleSchema", () => {
  it("reads the Product id from the URL and the Delivery Schedule from the form", () => {
    expect(offerScheduleSchema.parse({ productId: "7", schedule: "monthly" })).toEqual({
      productId: 7,
      deliverySchedule: "monthly",
    });
  });

  it.each([undefined, "", "daily"])("refuses %j as a Delivery Schedule", (schedule) => {
    expect(offerScheduleSchema.safeParse({ productId: "7", schedule }).success).toBe(false);
  });
});
