import { describe, expect, it } from "vitest";
import { listApprovedVendors } from "~/modules/vendors";
import { addProduct, listVendorProducts } from "../index";
import { addVendor, freshDatabase } from "./database";

const eggs = {
  name: "Free-range eggs (30)",
  description: "A tray of 30 large eggs.",
  priceCents: 15000,
  deliverySchedules: ["weekly", "monthly"],
} as const;
const addedOn = "2026-11-01";

describe("addProduct", () => {
  it("adds a Product the Vendor then sees with its Price and Delivery Schedules", async () => {
    const database = await freshDatabase();
    const vendorId = await addVendor(database, "Karoo Farm", "pending");

    const added = await addProduct(database, vendorId, eggs, addedOn);

    const expected = {
      id: added.id,
      name: "Free-range eggs (30)",
      description: "A tray of 30 large eggs.",
      priceCents: 15000,
      price: "R\u00a0150,00",
      deliverySchedules: ["weekly", "monthly"],
    };
    expect(added).toEqual(expected);
    expect(await listVendorProducts(database, vendorId)).toEqual([expected]);
  });

  it("keeps the Delivery Schedules once each, in the fixed order", async () => {
    const database = await freshDatabase();
    const vendorId = await addVendor(database, "Karoo Farm", "approved");

    const added = await addProduct(
      database,
      vendorId,
      {
        ...eggs,
        deliverySchedules: ["monthly", "weekly", "every-two-weeks", "monthly"],
      },
      addedOn,
    );

    const all = ["weekly", "every-two-weeks", "monthly"];
    expect(added.deliverySchedules).toEqual(all);
    const [listed] = await listVendorProducts(database, vendorId);
    expect(listed?.deliverySchedules).toEqual(all);
  });
});

describe("listVendorProducts", () => {
  it("lists only that Vendor's Products, by name, each with its own schedules", async () => {
    const database = await freshDatabase();
    const karoo = await addVendor(database, "Karoo Farm", "approved");
    const coffee = await addVendor(database, "Coffee Roasters", "approved");
    await addProduct(database, karoo, { ...eggs, name: "Lamb box", priceCents: 52500 }, addedOn);
    await addProduct(
      database,
      coffee,
      {
        ...eggs,
        name: "Espresso blend",
        deliverySchedules: ["every-two-weeks"],
      },
      addedOn,
    );
    await addProduct(database, karoo, { ...eggs, deliverySchedules: ["monthly"] }, addedOn);

    const listed = await listVendorProducts(database, karoo);

    expect(listed.map((p) => [p.name, p.price, p.deliverySchedules])).toEqual([
      ["Free-range eggs (30)", "R 150,00", ["monthly"]],
      ["Lamb box", "R 525,00", ["weekly", "monthly"]],
    ]);
    expect((await listVendorProducts(database, coffee)).map((p) => p.name)).toEqual([
      "Espresso blend",
    ]);
  });

  it("lists nothing for a Vendor without Products", async () => {
    const database = await freshDatabase();
    const karoo = await addVendor(database, "Karoo Farm", "approved");

    expect(await listVendorProducts(database, karoo)).toEqual([]);
  });
});

describe("what Customers see of an added Product", () => {
  it("shows an approved Vendor's new Product with its Price straight away", async () => {
    const database = await freshDatabase();
    const karoo = await addVendor(database, "Karoo Farm", "approved");

    await addProduct(database, karoo, eggs, addedOn);

    const [shown] = await listApprovedVendors(database);
    expect(shown?.products.map((p) => [p.name, p.price])).toEqual([
      ["Free-range eggs (30)", "R 150,00"],
    ]);
  });

  it("hides a pending Vendor's Products", async () => {
    const database = await freshDatabase();
    const bakery = await addVendor(database, "Bakery", "pending");

    await addProduct(database, bakery, eggs, addedOn);

    expect(await listApprovedVendors(database)).toEqual([]);
  });
});
