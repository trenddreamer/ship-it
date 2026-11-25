import { describe, expect, it } from "vitest";
import { openInbox } from "~/modules/notifications";
import {
  findSubscribableProduct,
  listCustomerSubscriptions,
  subscribe,
  switchDeliverySchedule,
} from "~/modules/subscriptions";
import { listApprovedVendors } from "~/modules/vendors";
import { addProduct, listVendorProducts, stopSelling } from "../index";
import { addCustomer, addVendor } from "./database";
import { eggsWithSubscriptions } from "./subscribed-eggs";

describe("stopping a Delivery Schedule", () => {
  it("cancels only the active Subscriptions on that schedule", async () => {
    const { database, karoo, eggs, thandi, sipho } = await eggsWithSubscriptions();

    const result = await stopSelling(
      database,
      karoo,
      { productId: eggs, deliverySchedule: "weekly" },
      "2026-11-20",
    );

    expect(result).toEqual({ ok: true, cancelled: 1 });
    expect(await listCustomerSubscriptions(database, thandi)).toMatchObject([
      { deliverySchedule: "weekly", cancelledOn: "2026-11-20" },
    ]);
    expect(await listCustomerSubscriptions(database, sipho)).toMatchObject([
      { deliverySchedule: "monthly", cancelledOn: null },
    ]);
  });

  it("tells the Customer the Vendor cancelled their Subscription, and why", async () => {
    const { database, karoo, eggs, thandi, sipho } = await eggsWithSubscriptions();

    await stopSelling(
      database,
      karoo,
      { productId: eggs, deliverySchedule: "weekly" },
      "2026-11-20",
    );

    expect((await openInbox(database, thandi)).map((n) => n.message)).toEqual([
      "Karoo Farm cancelled your Subscription to Free-range eggs: it stopped delivering it weekly.",
    ]);
    expect(await openInbox(database, sipho)).toEqual([]);
  });

  it("keeps the Product on sale, without that schedule to subscribe or switch to", async () => {
    const { database, karoo, eggs, sipho } = await eggsWithSubscriptions();
    const lerato = await addCustomer(database, "lerato@example.test");

    await stopSelling(
      database,
      karoo,
      { productId: eggs, deliverySchedule: "weekly" },
      "2026-11-20",
    );

    expect(await listApprovedVendors(database)).toMatchObject([
      { products: [{ name: "Free-range eggs" }] },
    ]);
    expect(await listVendorProducts(database, karoo)).toMatchObject([
      { name: "Free-range eggs", deliverySchedules: ["monthly"] },
    ]);
    expect(await findSubscribableProduct(database, eggs)).toMatchObject({
      deliverySchedules: ["monthly"],
    });
    expect(
      await subscribe(
        database,
        lerato,
        { productId: eggs, deliverySchedule: "weekly" },
        "2026-11-21",
      ),
    ).toEqual({ ok: false, error: "schedule-not-offered" });
    const [siphoEggs] = await listCustomerSubscriptions(database, sipho);
    expect(siphoEggs!.switchTo).toEqual([]);
    expect(
      await switchDeliverySchedule(
        database,
        sipho,
        { subscriptionId: siphoEggs!.id, deliverySchedule: "weekly" },
        "2026-11-21",
      ),
    ).toEqual({ ok: false, error: "schedule-not-offered" });
  });

  it("is final: stopping it again is refused", async () => {
    const { database, karoo, eggs } = await eggsWithSubscriptions();
    const weekly = { productId: eggs, deliverySchedule: "weekly" } as const;
    await stopSelling(database, karoo, weekly, "2026-11-20");

    expect(await stopSelling(database, karoo, weekly, "2026-11-21")).toEqual({
      ok: false,
      error: "schedule-not-offered",
    });
  });

  it("is refused for a schedule the Product doesn't offer", async () => {
    const { database, karoo, eggs } = await eggsWithSubscriptions();

    const result = await stopSelling(
      database,
      karoo,
      { productId: eggs, deliverySchedule: "every-two-weeks" },
      "2026-11-20",
    );

    expect(result).toEqual({ ok: false, error: "schedule-not-offered" });
    expect(await listVendorProducts(database, karoo)).toMatchObject([
      { deliverySchedules: ["weekly", "monthly"] },
    ]);
  });

  it("is refused for another Vendor's Product", async () => {
    const { database, eggs, thandi } = await eggsWithSubscriptions();
    const otherVendor = await addVendor(database, "Durban Spice Co.", "approved");

    const result = await stopSelling(
      database,
      otherVendor,
      { productId: eggs, deliverySchedule: "weekly" },
      "2026-11-20",
    );

    expect(result).toEqual({ ok: false, error: "product-not-found" });
    expect(await listCustomerSubscriptions(database, thandi)).toMatchObject([
      { cancelledOn: null },
    ]);
  });

  it("stops the Product when it is the last schedule, so it never has none", async () => {
    const database = (await eggsWithSubscriptions()).database;
    const karoo = await addVendor(database, "Karoo Lamb", "approved");
    const lamb = await addProduct(
      database,
      karoo,
      {
        name: "Lamb box",
        description: "Karoo lamb.",
        priceCents: 45000,
        deliverySchedules: ["monthly"],
      },
      "2026-01-01",
    );
    const naledi = await addCustomer(database, "naledi@example.test");
    await subscribe(
      database,
      naledi,
      { productId: lamb.id, deliverySchedule: "monthly" },
      "2026-11-01",
    );

    const result = await stopSelling(
      database,
      karoo,
      { productId: lamb.id, deliverySchedule: "monthly" },
      "2026-11-20",
    );

    expect(result).toEqual({ ok: true, cancelled: 1 });
    expect(await listVendorProducts(database, karoo)).toEqual([]);
    expect(await findSubscribableProduct(database, lamb.id)).toBeNull();
    expect((await openInbox(database, naledi)).map((n) => n.message)).toEqual([
      "Karoo Lamb cancelled your Subscription to Lamb box: it stopped selling it.",
    ]);
  });
});
