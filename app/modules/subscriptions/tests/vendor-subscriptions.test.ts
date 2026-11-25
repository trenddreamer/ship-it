import { describe, expect, it } from "vitest";
import { listVendorSubscriptions, subscribe } from "../index";
import { addCustomer, addVendor, addVendorProduct, freshDatabase } from "./database";

describe("a Vendor's Subscriptions", () => {
  it("lists each of the Vendor's Products, by name, with its active Subscriptions", async () => {
    const database = await freshDatabase();
    const karoo = await addVendor(database, "Karoo Farm");
    const coffee = await addVendor(database, "Cape Coffee");
    const lamb = await addVendorProduct(database, karoo.vendorId, "Lamb box");
    const eggs = await addVendorProduct(database, karoo.vendorId, "Eggs");
    await addVendorProduct(database, karoo.vendorId, "Boerewors");
    const espresso = await addVendorProduct(database, coffee.vendorId, "Espresso");
    const thandi = await addCustomer(database, "thandi@example.test");
    const sipho = await addCustomer(database, "sipho@example.test");

    await subscribe(
      database,
      thandi,
      { productId: eggs, deliverySchedule: "weekly" },
      "2026-11-25",
    );
    await subscribe(
      database,
      sipho,
      { productId: eggs, deliverySchedule: "monthly" },
      "2026-11-30",
    );
    await subscribe(database, sipho, { productId: lamb, deliverySchedule: "weekly" }, "2026-11-01");
    await subscribe(
      database,
      thandi,
      { productId: espresso, deliverySchedule: "weekly" },
      "2026-11-25",
    );

    expect(await listVendorSubscriptions(database, karoo.vendorId)).toEqual([
      { productId: expect.any(Number), productName: "Boerewors", subscriptions: [] },
      {
        productId: eggs,
        productName: "Eggs",
        subscriptions: [
          {
            id: expect.any(Number),
            customerEmail: "thandi@example.test",
            deliverySchedule: "weekly",
            subscribedOn: "2026-11-25",
            nextDueOn: "2026-11-26",
          },
          {
            id: expect.any(Number),
            customerEmail: "sipho@example.test",
            deliverySchedule: "monthly",
            subscribedOn: "2026-11-30",
            nextDueOn: "2026-12-01",
          },
        ],
      },
      {
        productId: lamb,
        productName: "Lamb box",
        subscriptions: [
          {
            id: expect.any(Number),
            customerEmail: "sipho@example.test",
            deliverySchedule: "weekly",
            subscribedOn: "2026-11-01",
            nextDueOn: "2026-11-02",
          },
        ],
      },
    ]);
  });

  it("is empty for a Vendor with no Products", async () => {
    const database = await freshDatabase();
    const spice = await addVendor(database, "Durban Spice");

    expect(await listVendorSubscriptions(database, spice.vendorId)).toEqual([]);
  });
});
