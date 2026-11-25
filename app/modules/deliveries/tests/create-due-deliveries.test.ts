import { describe, expect, it } from "vitest";
import {
  cancelSubscription,
  listCustomerSubscriptions,
  switchDeliverySchedule,
} from "~/modules/subscriptions";
import { createDueDeliveries, listVendorDueDeliveries } from "../index";
import {
  addCustomer,
  addSubscription,
  addVendor,
  addVendorProduct,
  freshDatabase,
  setPrice,
} from "./database";

async function weeklyEggsFrom(subscribedOn: string) {
  const database = await freshDatabase();
  const karoo = await addVendor(database, "Karoo Farm");
  const eggs = await addVendorProduct(database, karoo, "Free-range eggs", { priceCents: 9000 });
  const thandi = await addCustomer(database, "thandi@example.test");
  const subscriptionId = await addSubscription(database, thandi, eggs, "weekly", subscribedOn);
  const dueDates = async () =>
    (await listVendorDueDeliveries(database, karoo)).map((delivery) => delivery.dueOn);
  return { database, karoo, eggs, thandi, subscriptionId, dueDates };
}

describe("createDueDeliveries", () => {
  it("creates nothing new when run twice on the same day", async () => {
    const { database, dueDates } = await weeklyEggsFrom("2026-11-01");

    await createDueDeliveries(database, "2026-11-09");
    await createDueDeliveries(database, "2026-11-09");

    expect(await dueDates()).toEqual(["2026-11-02", "2026-11-09"]);
  });

  it("catches up after missed days, and goes on from there the next day", async () => {
    const { database, dueDates } = await weeklyEggsFrom("2026-11-01");

    await createDueDeliveries(database, "2026-11-02");
    await createDueDeliveries(database, "2026-11-20");
    expect(await dueDates()).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]);

    await createDueDeliveries(database, "2026-11-23");
    expect(await dueDates()).toEqual(["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"]);
  });

  it("moves the Subscription's next due date past the Deliveries it created", async () => {
    const { database, thandi, dueDates } = await weeklyEggsFrom("2026-11-01");

    await createDueDeliveries(database, "2026-11-10");

    expect(await dueDates()).toEqual(["2026-11-02", "2026-11-09"]);
    expect(await listCustomerSubscriptions(database, thandi)).toMatchObject([
      { nextDueOn: "2026-11-16" },
    ]);
  });

  it("records the Price of each Delivery when it falls due", async () => {
    const { database, karoo, eggs } = await weeklyEggsFrom("2026-11-01");

    await createDueDeliveries(database, "2026-11-02");
    await setPrice(database, eggs, 9500);
    await createDueDeliveries(database, "2026-11-09");

    expect(await listVendorDueDeliveries(database, karoo)).toMatchObject([
      { dueOn: "2026-11-02", priceCents: 9000 },
      { dueOn: "2026-11-09", priceCents: 9500 },
    ]);
  });

  it("creates Deliveries for every Subscription", async () => {
    const { database, karoo, eggs, dueDates } = await weeklyEggsFrom("2026-11-01");
    const sipho = await addCustomer(database, "sipho@example.test");
    await addSubscription(database, sipho, eggs, "monthly", "2026-11-03");

    await createDueDeliveries(database, "2026-11-04");

    expect(await dueDates()).toEqual(["2026-11-02", "2026-11-04"]);
    expect(await listVendorDueDeliveries(database, karoo)).toMatchObject([
      { customerEmail: "thandi@example.test" },
      { customerEmail: "sipho@example.test" },
    ]);
  });
});

describe("createDueDeliveries after a cancellation", () => {
  it("still creates the Delivery due on the day of cancelling, even when the job hadn't run", async () => {
    const { database, thandi, subscriptionId, dueDates } = await weeklyEggsFrom("2026-11-01");
    await createDueDeliveries(database, "2026-11-02");

    await cancelSubscription(database, thandi, subscriptionId, "2026-11-09");
    await createDueDeliveries(database, "2026-11-20");

    expect(await dueDates()).toEqual(["2026-11-02", "2026-11-09"]);
  });

  it("creates none due after the day of cancelling", async () => {
    const { database, thandi, subscriptionId, dueDates } = await weeklyEggsFrom("2026-11-01");

    await cancelSubscription(database, thandi, subscriptionId, "2026-11-08");
    await createDueDeliveries(database, "2026-11-09");
    await createDueDeliveries(database, "2026-12-31");

    expect(await dueDates()).toEqual(["2026-11-02"]);
  });

  it("creates none due after today, even for a Subscription cancelled later", async () => {
    const { database, thandi, subscriptionId, dueDates } = await weeklyEggsFrom("2026-11-01");
    await cancelSubscription(database, thandi, subscriptionId, "2026-11-20");

    await createDueDeliveries(database, "2026-11-10");

    expect(await dueDates()).toEqual(["2026-11-02", "2026-11-09"]);
  });

  it("creates none when cancelled on the day of subscribing", async () => {
    const { database, thandi, subscriptionId, dueDates } = await weeklyEggsFrom("2026-11-01");

    await cancelSubscription(database, thandi, subscriptionId, "2026-11-01");
    await createDueDeliveries(database, "2026-11-30");

    expect(await dueDates()).toEqual([]);
  });
});

describe("createDueDeliveries after a switch of Delivery Schedule", () => {
  it("keeps a Delivery due on the day of switching under the old schedule, even when the job hadn't run", async () => {
    const { database, thandi, subscriptionId, dueDates } = await weeklyEggsFrom("2026-11-01");
    await createDueDeliveries(database, "2026-11-02");

    await switchDeliverySchedule(
      database,
      thandi,
      { subscriptionId, deliverySchedule: "monthly" },
      "2026-11-09",
    );
    await createDueDeliveries(database, "2026-12-10");

    expect(await dueDates()).toEqual(["2026-11-02", "2026-11-09", "2026-11-10", "2026-12-10"]);
  });

  it("runs the new schedule from the day after the switch", async () => {
    const { database, thandi, subscriptionId, dueDates } = await weeklyEggsFrom("2026-11-01");

    await switchDeliverySchedule(
      database,
      thandi,
      { subscriptionId, deliverySchedule: "every-two-weeks" },
      "2026-11-05",
    );
    await createDueDeliveries(database, "2026-11-20");

    expect(await dueDates()).toEqual(["2026-11-02", "2026-11-06", "2026-11-20"]);
  });
});
