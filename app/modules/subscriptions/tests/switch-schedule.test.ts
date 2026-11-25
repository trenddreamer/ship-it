import { describe, expect, it } from "vitest";
import { listCustomerSubscriptions, subscribe, switchDeliverySchedule } from "../index";
import { addCustomer, addVendor, addVendorProduct, freshDatabase } from "./database";

async function subscribedToEggs() {
  const database = await freshDatabase();
  const { vendorId } = await addVendor(database, "Karoo Farm");
  const eggs = await addVendorProduct(database, vendorId, "Free-range eggs", {
    deliverySchedules: ["weekly", "monthly"],
  });
  const thandi = await addCustomer(database, "thandi@example.test");
  await subscribe(database, thandi, { productId: eggs, deliverySchedule: "weekly" }, "2026-11-01");
  const [subscription] = await listCustomerSubscriptions(database, thandi);
  return { database, thandi, eggs, subscriptionId: subscription!.id };
}

describe("switching Delivery Schedule", () => {
  it("switches to another offered schedule, next due the day after the switch", async () => {
    const { database, thandi, subscriptionId } = await subscribedToEggs();

    const result = await switchDeliverySchedule(
      database,
      thandi,
      { subscriptionId, deliverySchedule: "monthly" },
      "2026-11-30",
    );

    expect(result).toEqual({ ok: true });
    expect(await listCustomerSubscriptions(database, thandi)).toMatchObject([
      { id: subscriptionId, deliverySchedule: "monthly", nextDueOn: "2026-12-01" },
    ]);
  });

  it("is refused, changing nothing, on a schedule the Product doesn't offer", async () => {
    const { database, thandi, subscriptionId } = await subscribedToEggs();

    const result = await switchDeliverySchedule(
      database,
      thandi,
      { subscriptionId, deliverySchedule: "every-two-weeks" },
      "2026-11-30",
    );

    expect(result).toEqual({ ok: false, error: "schedule-not-offered" });
    expect(await listCustomerSubscriptions(database, thandi)).toMatchObject([
      { deliverySchedule: "weekly", nextDueOn: "2026-11-02" },
    ]);
  });

  it("is refused, changing nothing, on the schedule the Subscription is already on", async () => {
    const { database, thandi, subscriptionId } = await subscribedToEggs();

    const result = await switchDeliverySchedule(
      database,
      thandi,
      { subscriptionId, deliverySchedule: "weekly" },
      "2026-11-30",
    );

    expect(result).toEqual({ ok: false, error: "same-schedule" });
    expect(await listCustomerSubscriptions(database, thandi)).toMatchObject([
      { deliverySchedule: "weekly", nextDueOn: "2026-11-02" },
    ]);
  });

  it("is refused for another Customer's Subscription, or one that doesn't exist", async () => {
    const { database, thandi, subscriptionId } = await subscribedToEggs();
    const sipho = await addCustomer(database, "sipho@example.test");

    for (const [customerId, id] of [
      [sipho, subscriptionId],
      [thandi, 9999],
    ] as const) {
      const result = await switchDeliverySchedule(
        database,
        customerId,
        { subscriptionId: id, deliverySchedule: "monthly" },
        "2026-11-30",
      );
      expect(result).toEqual({ ok: false, error: "subscription-not-found" });
    }
    expect(await listCustomerSubscriptions(database, thandi)).toMatchObject([
      { deliverySchedule: "weekly", nextDueOn: "2026-11-02" },
    ]);
  });

  it("lists the other schedules the Product offers as the ones to switch to", async () => {
    const database = await freshDatabase();
    const { vendorId } = await addVendor(database, "Karoo Farm");
    const eggs = await addVendorProduct(database, vendorId, "Free-range eggs", {
      deliverySchedules: ["monthly", "weekly", "every-two-weeks"],
    });
    const lamb = await addVendorProduct(database, vendorId, "Lamb box", {
      deliverySchedules: ["monthly"],
    });
    const thandi = await addCustomer(database, "thandi@example.test");
    await subscribe(
      database,
      thandi,
      { productId: eggs, deliverySchedule: "weekly" },
      "2026-11-01",
    );
    await subscribe(
      database,
      thandi,
      { productId: lamb, deliverySchedule: "monthly" },
      "2026-11-01",
    );
    const [eggsSubscription] = await listCustomerSubscriptions(database, thandi);

    expect(
      (await listCustomerSubscriptions(database, thandi)).map((s) => [s.productName, s.switchTo]),
    ).toEqual([
      ["Free-range eggs", ["every-two-weeks", "monthly"]],
      ["Lamb box", []],
    ]);

    await switchDeliverySchedule(
      database,
      thandi,
      { subscriptionId: eggsSubscription!.id, deliverySchedule: "monthly" },
      "2026-11-02",
    );
    expect((await listCustomerSubscriptions(database, thandi))[0]!.switchTo).toEqual([
      "weekly",
      "every-two-weeks",
    ]);
  });
});
