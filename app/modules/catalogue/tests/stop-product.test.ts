import { describe, expect, it } from "vitest";
import { countUnread, openInbox } from "~/modules/notifications";
import {
  findSubscribableProduct,
  listCustomerSubscriptions,
  subscribe,
} from "~/modules/subscriptions";
import { listApprovedVendors } from "~/modules/vendors";
import { addProduct, listVendorProducts, stopSelling } from "../index";
import { addCustomer, addVendor } from "./database";
import { eggsWithSubscribers } from "./subscribed-eggs";

const wholeProduct = (productId: number) => ({ productId, deliverySchedule: null });

describe("stopping a Product", () => {
  it("cancels every active Subscription to it, as of the stop", async () => {
    const { database, karoo, eggs, thandi, sipho } = await eggsWithSubscribers();

    const result = await stopSelling(database, karoo, wholeProduct(eggs), "2026-11-20");

    expect(result).toEqual({ ok: true, cancelled: 2 });
    for (const customer of [thandi, sipho]) {
      expect(await listCustomerSubscriptions(database, customer)).toMatchObject([
        { productName: "Free-range eggs", cancelledOn: "2026-11-20" },
      ]);
    }
  });

  it("tells each Customer the Vendor cancelled their Subscription, and why", async () => {
    const { database, karoo, eggs, thandi, sipho } = await eggsWithSubscribers();
    const bystander = await addCustomer(database, "bystander@example.test");

    await stopSelling(database, karoo, wholeProduct(eggs), "2026-11-20");

    for (const customer of [thandi, sipho]) {
      expect((await openInbox(database, customer)).map((n) => n.message)).toEqual([
        "Karoo Farm cancelled your Subscription to Free-range eggs: it stopped selling it.",
      ]);
    }
    expect(await countUnread(database, bystander)).toBe(0);
  });

  it("leaves other Products and their Subscriptions alone", async () => {
    const { database, karoo, eggs, thandi } = await eggsWithSubscribers();
    const lamb = await addProduct(database, karoo, {
      name: "Lamb box",
      description: "Karoo lamb.",
      priceCents: 45000,
      deliverySchedules: ["monthly"],
    });
    await subscribe(
      database,
      thandi,
      { productId: lamb.id, deliverySchedule: "monthly" },
      "2026-11-01",
    );

    await stopSelling(database, karoo, wholeProduct(eggs), "2026-11-20");

    expect(await listCustomerSubscriptions(database, thandi)).toMatchObject([
      { productName: "Lamb box", cancelledOn: null },
      { productName: "Free-range eggs", cancelledOn: "2026-11-20" },
    ]);
    expect((await listVendorProducts(database, karoo)).map((p) => p.name)).toEqual(["Lamb box"]);
  });

  it("hides it from Customers: the home page, search and subscribing", async () => {
    const { database, karoo, eggs } = await eggsWithSubscribers();
    const lerato = await addCustomer(database, "lerato@example.test");

    await stopSelling(database, karoo, wholeProduct(eggs), "2026-11-20");

    expect(await listApprovedVendors(database)).toMatchObject([
      { name: "Karoo Farm", products: [] },
    ]);
    expect(await findSubscribableProduct(database, eggs)).toBeNull();
    expect(
      await subscribe(
        database,
        lerato,
        { productId: eggs, deliverySchedule: "weekly" },
        "2026-11-21",
      ),
    ).toEqual({ ok: false, error: "product-not-found" });
  });

  it("is final: stopping it again is refused, and nobody is told twice", async () => {
    const { database, karoo, eggs, thandi } = await eggsWithSubscribers();
    await stopSelling(database, karoo, wholeProduct(eggs), "2026-11-20");

    const again = await stopSelling(database, karoo, wholeProduct(eggs), "2026-11-21");

    expect(again).toEqual({ ok: false, error: "product-not-found" });
    expect(await openInbox(database, thandi)).toHaveLength(1);
  });

  it("is refused for another Vendor's Product, which carries on", async () => {
    const { database, eggs, thandi } = await eggsWithSubscribers();
    const otherVendor = await addVendor(database, "Durban Spice Co.", "approved");

    const result = await stopSelling(database, otherVendor, wholeProduct(eggs), "2026-11-20");

    expect(result).toEqual({ ok: false, error: "product-not-found" });
    expect(await listCustomerSubscriptions(database, thandi)).toMatchObject([
      { productName: "Free-range eggs", cancelledOn: null },
    ]);
    expect(await countUnread(database, thandi)).toBe(0);
  });
});
