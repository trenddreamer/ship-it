import { describe, expect, it } from "vitest";
import type { DeliverySchedule } from "~/db/schema";
import { createDueDeliveries, listVendorDueDeliveries } from "../index";
import {
  addCustomer,
  addSubscription,
  addVendor,
  addVendorProduct,
  freshDatabase,
} from "./database";

/** The due dates of the Deliveries created by `today` for one Subscription. */
async function dueDates(
  schedule: DeliverySchedule,
  subscribedOn: string,
  today: string,
): Promise<string[]> {
  const database = await freshDatabase();
  const vendor = await addVendor(database, "Karoo Farm");
  const product = await addVendorProduct(database, vendor, "Free-range eggs");
  const customer = await addCustomer(database, "thandi@example.test");
  await addSubscription(database, customer, product, schedule, subscribedOn);
  await createDueDeliveries(database, today);
  const due = await listVendorDueDeliveries(database, vendor);
  return due.map((delivery) => delivery.dueOn);
}

describe("due dates", () => {
  it("has no Delivery due on the day of subscribing", async () => {
    expect(await dueDates("weekly", "2026-11-01", "2026-11-01")).toEqual([]);
  });

  it("is weekly: the day after subscribing, then every 7 days", async () => {
    expect(await dueDates("weekly", "2026-11-01", "2026-11-23")).toEqual([
      "2026-11-02",
      "2026-11-09",
      "2026-11-16",
      "2026-11-23",
    ]);
  });

  it("is every two weeks: the day after subscribing, then every 14 days", async () => {
    expect(await dueDates("every-two-weeks", "2026-12-20", "2027-01-18")).toEqual([
      "2026-12-21",
      "2027-01-04",
      "2027-01-18",
    ]);
  });

  it("is monthly on the day of the month of the first Delivery", async () => {
    expect(await dueDates("monthly", "2026-11-14", "2027-02-15")).toEqual([
      "2026-11-15",
      "2026-12-15",
      "2027-01-15",
      "2027-02-15",
    ]);
  });

  it("falls on the month's last day when the 31st doesn't exist, then returns to the 31st", async () => {
    expect(await dueDates("monthly", "2026-12-30", "2027-05-31")).toEqual([
      "2026-12-31",
      "2027-01-31",
      "2027-02-28",
      "2027-03-31",
      "2027-04-30",
      "2027-05-31",
    ]);
  });

  it("falls on 29 February in a leap year", async () => {
    expect(await dueDates("monthly", "2028-01-29", "2028-03-30")).toEqual([
      "2028-01-30",
      "2028-02-29",
      "2028-03-30",
    ]);
  });

  it("keeps the 29th in February of a leap year, and falls on the 28th otherwise", async () => {
    expect(await dueDates("monthly", "2027-12-28", "2028-02-29")).toEqual([
      "2027-12-29",
      "2028-01-29",
      "2028-02-29",
    ]);
    expect(await dueDates("monthly", "2026-12-28", "2027-03-29")).toEqual([
      "2026-12-29",
      "2027-01-29",
      "2027-02-28",
      "2027-03-29",
    ]);
  });

  it("crosses a year end monthly, past December", async () => {
    expect(await dueDates("monthly", "2026-10-04", "2027-01-05")).toEqual([
      "2026-10-05",
      "2026-11-05",
      "2026-12-05",
      "2027-01-05",
    ]);
  });
});
