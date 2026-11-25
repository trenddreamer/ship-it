import { describe, expect, it } from "vitest";
import { createDueDeliveries, listVendorDueDeliveries } from "../index";
import {
  addCustomer,
  addSubscription,
  addVendor,
  addVendorProduct,
  freshDatabase,
  homeAddress,
  markShipped,
} from "./database";

describe("a Vendor's due Deliveries", () => {
  it("shows a Delivery once it falls due, with the Product, Customer and Delivery Address", async () => {
    const database = await freshDatabase();
    const karoo = await addVendor(database, "Karoo Farm");
    const eggs = await addVendorProduct(database, karoo, "Free-range eggs", { priceCents: 9950 });
    const thandi = await addCustomer(database, "thandi@example.test");
    await addSubscription(database, thandi, eggs, "weekly", "2026-11-01");

    await createDueDeliveries(database, "2026-11-02");

    expect(await listVendorDueDeliveries(database, karoo)).toEqual([
      {
        id: expect.any(Number),
        dueOn: "2026-11-02",
        productName: "Free-range eggs",
        customerEmail: "thandi@example.test",
        deliveryAddress: homeAddress,
        priceCents: 9950,
        price: "R\u00a099,50",
      },
    ]);
  });

  it("shows only the Vendor's own Deliveries, oldest due date first", async () => {
    const database = await freshDatabase();
    const karoo = await addVendor(database, "Karoo Farm");
    const coffee = await addVendor(database, "Cape Town Coffee Roasters");
    const eggs = await addVendorProduct(database, karoo, "Free-range eggs");
    const lamb = await addVendorProduct(database, karoo, "Karoo lamb box");
    const espresso = await addVendorProduct(database, coffee, "House espresso");
    const thandi = await addCustomer(database, "thandi@example.test");
    const sipho = await addCustomer(database, "sipho@example.test", {
      street: "3 Vilakazi Street",
      suburb: "Orlando West",
      city: "Soweto",
      postalCode: "1804",
    });
    await addSubscription(database, thandi, lamb, "monthly", "2026-11-03");
    await addSubscription(database, sipho, eggs, "weekly", "2026-11-01");
    await addSubscription(database, thandi, espresso, "weekly", "2026-11-01");

    await createDueDeliveries(database, "2026-11-04");

    expect(await listVendorDueDeliveries(database, karoo)).toMatchObject([
      { dueOn: "2026-11-02", productName: "Free-range eggs", customerEmail: "sipho@example.test" },
      { dueOn: "2026-11-04", productName: "Karoo lamb box", customerEmail: "thandi@example.test" },
    ]);
    expect(await listVendorDueDeliveries(database, karoo)).toMatchObject([
      { deliveryAddress: { city: "Soweto" } },
      { deliveryAddress: { city: "Cape Town" } },
    ]);
    expect(await listVendorDueDeliveries(database, coffee)).toMatchObject([
      { productName: "House espresso" },
    ]);
  });

  it("leaves out Deliveries already shipped", async () => {
    const database = await freshDatabase();
    const karoo = await addVendor(database, "Karoo Farm");
    const eggs = await addVendorProduct(database, karoo, "Free-range eggs");
    const thandi = await addCustomer(database, "thandi@example.test");
    await addSubscription(database, thandi, eggs, "weekly", "2026-11-01");
    await createDueDeliveries(database, "2026-11-09");
    const [first] = await listVendorDueDeliveries(database, karoo);

    await markShipped(database, first!.id, "2026-11-09");

    expect(await listVendorDueDeliveries(database, karoo)).toMatchObject([{ dueOn: "2026-11-09" }]);
  });
});
