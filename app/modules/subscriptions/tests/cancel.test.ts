import { describe, expect, it } from "vitest";
import { countUnread, openInbox } from "~/modules/notifications";
import {
  cancelSubscription,
  listCustomerSubscriptions,
  listVendorSubscriptions,
  subscribe,
  switchDeliverySchedule,
} from "../index";
import { addCustomer, addVendor, addVendorProduct, freshDatabase } from "./database";

async function subscribedToEggs() {
  const database = await freshDatabase();
  const karoo = await addVendor(database, "Karoo Farm");
  const eggs = await addVendorProduct(database, karoo.vendorId, "Free-range eggs");
  const thandi = await addCustomer(database, "thandi@example.test");
  await subscribe(database, thandi, { productId: eggs, deliverySchedule: "weekly" }, "2026-11-01");
  const [subscription] = await listCustomerSubscriptions(database, thandi);
  return { database, karoo, thandi, eggs, subscriptionId: subscription!.id };
}

describe("cancelling a Subscription", () => {
  it("shows it as cancelled, with no next due date", async () => {
    const { database, thandi, subscriptionId } = await subscribedToEggs();

    const result = await cancelSubscription(database, thandi, subscriptionId, "2026-11-20");

    expect(result).toEqual({ ok: true });
    expect(await listCustomerSubscriptions(database, thandi)).toMatchObject([
      {
        id: subscriptionId,
        productName: "Free-range eggs",
        cancelledOn: "2026-11-20",
        nextDueOn: null,
      },
    ]);
  });

  it("tells the Vendor, and nobody else", async () => {
    const { database, karoo, thandi, subscriptionId } = await subscribedToEggs();
    await openInbox(database, karoo.accountId);

    await cancelSubscription(database, thandi, subscriptionId, "2026-11-20");

    const inbox = await openInbox(database, karoo.accountId);
    expect(inbox.filter((n) => n.unread).map((n) => n.message)).toEqual([
      "thandi@example.test cancelled their Subscription to Free-range eggs.",
    ]);
    expect(await countUnread(database, thandi)).toBe(0);
  });

  it("drops it from the Vendor's active Subscriptions", async () => {
    const { database, karoo, thandi, subscriptionId } = await subscribedToEggs();

    await cancelSubscription(database, thandi, subscriptionId, "2026-11-20");

    expect(await listVendorSubscriptions(database, karoo.vendorId)).toEqual([
      { productId: expect.any(Number), productName: "Free-range eggs", subscriptions: [] },
    ]);
  });

  it("lets the Customer subscribe to the same Product again", async () => {
    const { database, thandi, eggs, subscriptionId } = await subscribedToEggs();
    await cancelSubscription(database, thandi, subscriptionId, "2026-11-20");

    const again = await subscribe(
      database,
      thandi,
      { productId: eggs, deliverySchedule: "monthly" },
      "2026-11-21",
    );

    expect(again).toEqual({ ok: true });
    expect(await listCustomerSubscriptions(database, thandi)).toMatchObject([
      { deliverySchedule: "monthly", nextDueOn: "2026-11-22", cancelledOn: null },
      {
        id: subscriptionId,
        deliverySchedule: "weekly",
        nextDueOn: null,
        cancelledOn: "2026-11-20",
      },
    ]);
  });

  it("is refused, notifying nobody, for another Customer's, a cancelled or an unknown Subscription", async () => {
    const { database, karoo, thandi, subscriptionId } = await subscribedToEggs();
    const sipho = await addCustomer(database, "sipho@example.test");

    expect(await cancelSubscription(database, sipho, subscriptionId, "2026-11-20")).toEqual({
      ok: false,
      error: "subscription-not-found",
    });
    expect(await listCustomerSubscriptions(database, thandi)).toMatchObject([
      { cancelledOn: null },
    ]);

    await cancelSubscription(database, thandi, subscriptionId, "2026-11-20");
    await openInbox(database, karoo.accountId);
    for (const id of [subscriptionId, 9999]) {
      expect(await cancelSubscription(database, thandi, id, "2026-11-25")).toEqual({
        ok: false,
        error: "subscription-not-found",
      });
    }
    expect(await listCustomerSubscriptions(database, thandi)).toMatchObject([
      { cancelledOn: "2026-11-20" },
    ]);
    expect(await countUnread(database, karoo.accountId)).toBe(0);
  });

  it("can't be switched once cancelled", async () => {
    const { database, thandi, subscriptionId } = await subscribedToEggs();
    await cancelSubscription(database, thandi, subscriptionId, "2026-11-20");

    const result = await switchDeliverySchedule(
      database,
      thandi,
      { subscriptionId, deliverySchedule: "monthly" },
      "2026-11-21",
    );

    expect(result).toEqual({ ok: false, error: "subscription-not-found" });
    expect(await listCustomerSubscriptions(database, thandi)).toMatchObject([
      { deliverySchedule: "weekly", nextDueOn: null },
    ]);
  });

  it("lists active Subscriptions by Product name, then cancelled ones, latest cancelled first", async () => {
    const database = await freshDatabase();
    const { vendorId } = await addVendor(database, "Karoo Farm");
    const thandi = await addCustomer(database, "thandi@example.test");
    const ids: Record<string, number> = {};
    for (const name of ["Biltong", "Eggs", "Lamb box", "Butter"]) {
      const productId = await addVendorProduct(database, vendorId, name);
      await subscribe(database, thandi, { productId, deliverySchedule: "weekly" }, "2026-11-01");
      const all = await listCustomerSubscriptions(database, thandi);
      ids[name] = all.find((s) => s.productName === name)!.id;
    }
    await cancelSubscription(database, thandi, ids["Eggs"]!, "2026-11-10");
    await cancelSubscription(database, thandi, ids["Biltong"]!, "2026-11-12");

    expect(
      (await listCustomerSubscriptions(database, thandi)).map((s) => [
        s.productName,
        s.cancelledOn,
      ]),
    ).toEqual([
      ["Butter", null],
      ["Lamb box", null],
      ["Biltong", "2026-11-12"],
      ["Eggs", "2026-11-10"],
    ]);
  });
});
