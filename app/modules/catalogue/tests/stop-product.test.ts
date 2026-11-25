import { describe, expect, it } from "vitest";
import { countUnread, openInbox } from "~/modules/notifications";
import { listCustomerSubscriptions, subscribe } from "~/modules/subscriptions";
import { addProduct, stopSelling } from "../index";
import { addCustomer, addVendor, freshDatabase } from "./database";

async function eggsWithSubscribers() {
  const database = await freshDatabase();
  const karoo = await addVendor(database, "Karoo Farm", "approved");
  const eggs = await addProduct(database, karoo, {
    name: "Free-range eggs",
    description: "A tray of 30.",
    priceCents: 15000,
    deliverySchedules: ["weekly", "monthly"],
  });
  const thandi = await addCustomer(database, "thandi@example.test");
  const sipho = await addCustomer(database, "sipho@example.test");
  await subscribe(
    database,
    thandi,
    { productId: eggs.id, deliverySchedule: "weekly" },
    "2026-11-01",
  );
  await subscribe(
    database,
    sipho,
    { productId: eggs.id, deliverySchedule: "monthly" },
    "2026-11-01",
  );
  return { database, karoo, eggs: eggs.id, thandi, sipho };
}

describe("stopping a Product", () => {
  it("cancels every active Subscription to it, as of the stop", async () => {
    const { database, karoo, eggs, thandi, sipho } = await eggsWithSubscribers();

    const result = await stopSelling(
      database,
      karoo,
      { productId: eggs, deliverySchedule: null },
      "2026-11-20",
    );

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

    await stopSelling(database, karoo, { productId: eggs, deliverySchedule: null }, "2026-11-20");

    for (const customer of [thandi, sipho]) {
      expect((await openInbox(database, customer)).map((n) => n.message)).toEqual([
        "Karoo Farm cancelled your Subscription to Free-range eggs: it stopped selling it.",
      ]);
    }
    expect(await countUnread(database, bystander)).toBe(0);
  });
});
