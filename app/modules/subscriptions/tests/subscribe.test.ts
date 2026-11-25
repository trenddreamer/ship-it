import { describe, expect, it } from "vitest";
import { countUnread, openInbox } from "~/modules/notifications";
import { findSubscribableProduct, listCustomerSubscriptions, subscribe } from "../index";
import { addCustomer, addVendor, addVendorProduct, freshDatabase } from "./database";

const today = "2026-11-25";

function weekly(productId: number) {
  return { productId, deliverySchedule: "weekly" } as const;
}

describe("subscribing", () => {
  it("subscribes a Customer to a Product on a Delivery Schedule it offers, first due the next day", async () => {
    const database = await freshDatabase();
    const { vendorId } = await addVendor(database, "Karoo Farm");
    const eggs = await addVendorProduct(database, vendorId, "Free-range eggs", {
      priceCents: 15050,
      deliverySchedules: ["weekly", "monthly"],
    });
    const thandi = await addCustomer(database, "thandi@example.test");

    const result = await subscribe(
      database,
      thandi,
      { productId: eggs, deliverySchedule: "monthly" },
      today,
    );

    expect(result).toEqual({ ok: true });
    expect(await listCustomerSubscriptions(database, thandi)).toEqual([
      {
        id: expect.any(Number),
        productName: "Free-range eggs",
        vendorName: "Karoo Farm",
        deliverySchedule: "monthly",
        priceCents: 15050,
        price: "R\u00a0150,50",
        nextDueOn: "2026-11-26",
      },
    ]);
  });

  it("is refused, creating nothing, when the Customer has no Delivery Address", async () => {
    const database = await freshDatabase();
    const { vendorId } = await addVendor(database, "Karoo Farm");
    const eggs = await addVendorProduct(database, vendorId, "Free-range eggs");
    const sipho = await addCustomer(database, "sipho@example.test", { withAddress: false });

    const result = await subscribe(
      database,
      sipho,
      { productId: eggs, deliverySchedule: "weekly" },
      today,
    );

    expect(result).toEqual({ ok: false, error: "no-delivery-address" });
    expect(await listCustomerSubscriptions(database, sipho)).toEqual([]);
  });

  it("is refused on a Delivery Schedule the Product doesn't offer", async () => {
    const database = await freshDatabase();
    const { vendorId } = await addVendor(database, "Karoo Farm");
    const eggs = await addVendorProduct(database, vendorId, "Free-range eggs", {
      deliverySchedules: ["weekly", "monthly"],
    });
    const thandi = await addCustomer(database, "thandi@example.test");

    const result = await subscribe(
      database,
      thandi,
      { productId: eggs, deliverySchedule: "every-two-weeks" },
      today,
    );

    expect(result).toEqual({ ok: false, error: "schedule-not-offered" });
    expect(await listCustomerSubscriptions(database, thandi)).toEqual([]);
  });

  it("is refused for a Product Customers can't see: unknown, or its Vendor not approved", async () => {
    const database = await freshDatabase();
    const pending = await addVendor(database, "Joburg Bakery", "pending");
    const rejected = await addVendor(database, "Garden Route Honey", "rejected");
    const thandi = await addCustomer(database, "thandi@example.test");
    const hidden = [
      await addVendorProduct(database, pending.vendorId, "Sourdough loaf"),
      await addVendorProduct(database, rejected.vendorId, "Fynbos honey"),
      9999,
    ];

    for (const productId of hidden) {
      const pick = { productId, deliverySchedule: "weekly" } as const;
      expect(await subscribe(database, thandi, pick, today)).toEqual({
        ok: false,
        error: "product-not-found",
      });
      expect(await findSubscribableProduct(database, productId)).toBeNull();
    }
    expect(await listCustomerSubscriptions(database, thandi)).toEqual([]);
  });

  it("refuses a second active Subscription to the same Product, even on another schedule", async () => {
    const database = await freshDatabase();
    const { vendorId } = await addVendor(database, "Karoo Farm");
    const eggs = await addVendorProduct(database, vendorId, "Free-range eggs");
    const thandi = await addCustomer(database, "thandi@example.test");
    await subscribe(database, thandi, { productId: eggs, deliverySchedule: "weekly" }, today);

    const again = await subscribe(
      database,
      thandi,
      { productId: eggs, deliverySchedule: "monthly" },
      "2026-11-28",
    );

    expect(again).toEqual({ ok: false, error: "already-subscribed" });
    expect(await listCustomerSubscriptions(database, thandi)).toMatchObject([
      { productName: "Free-range eggs", deliverySchedule: "weekly", nextDueOn: "2026-11-26" },
    ]);
  });

  it("lets another Customer subscribe to the same Product, and one Customer to many Products", async () => {
    const database = await freshDatabase();
    const { vendorId } = await addVendor(database, "Karoo Farm");
    const eggs = await addVendorProduct(database, vendorId, "Free-range eggs");
    const lamb = await addVendorProduct(database, vendorId, "Karoo lamb box");
    const thandi = await addCustomer(database, "thandi@example.test");
    const sipho = await addCustomer(database, "sipho@example.test");

    expect(await subscribe(database, thandi, weekly(lamb), today)).toEqual({ ok: true });
    expect(await subscribe(database, thandi, weekly(eggs), "2026-12-31")).toEqual({ ok: true });
    expect(await subscribe(database, sipho, weekly(eggs), today)).toEqual({ ok: true });

    expect(await listCustomerSubscriptions(database, thandi)).toMatchObject([
      { productName: "Free-range eggs", nextDueOn: "2027-01-01" },
      { productName: "Karoo lamb box", nextDueOn: "2026-11-26" },
    ]);
    expect(await listCustomerSubscriptions(database, sipho)).toMatchObject([
      { productName: "Free-range eggs" },
    ]);
  });

  it("tells the Vendor about each new Subscription, and nobody about a refused one", async () => {
    const database = await freshDatabase();
    const karoo = await addVendor(database, "Karoo Farm");
    const other = await addVendor(database, "Cape Coffee");
    const eggs = await addVendorProduct(database, karoo.vendorId, "Free-range eggs", {
      deliverySchedules: ["every-two-weeks"],
    });
    const thandi = await addCustomer(database, "thandi@example.test");
    const pick = { productId: eggs, deliverySchedule: "every-two-weeks" } as const;
    // Signing up and approval left Notifications in the Vendors' Inboxes; clear them.
    await openInbox(database, karoo.accountId);
    await openInbox(database, other.accountId);

    await subscribe(database, thandi, pick, today);
    await subscribe(database, thandi, pick, today);

    expect((await openInbox(database, karoo.accountId)).map((n) => [n.message, n.unread])).toEqual([
      ["thandi@example.test subscribed to Free-range eggs, delivered every two weeks.", true],
    ]);
    expect(await countUnread(database, other.accountId)).toBe(0);
    expect(await countUnread(database, thandi)).toBe(0);
  });
});
