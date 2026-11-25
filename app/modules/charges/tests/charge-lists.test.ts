import { describe, expect, it } from "vitest";
import { listCustomerCharges, listVendorCharges } from "../index";
import {
  addCustomer,
  addSubscription,
  addVendor,
  addVendorProduct,
  freshDatabase,
  shipAllDue,
} from "./database";

async function twoVendorsTwoCustomers() {
  const database = await freshDatabase();
  const karoo = await addVendor(database, "Karoo Farm");
  const coffee = await addVendor(database, "Cape Town Coffee Roasters");
  const eggs = await addVendorProduct(database, karoo, "Free-range eggs", { priceCents: 9950 });
  const lamb = await addVendorProduct(database, karoo, "Karoo lamb box", { priceCents: 45000 });
  const espresso = await addVendorProduct(database, coffee, "House espresso", {
    priceCents: 18500,
  });
  const thandi = await addCustomer(database, "thandi@example.test");
  const sipho = await addCustomer(database, "sipho@example.test");
  await addSubscription(database, thandi, eggs, "weekly", "2026-11-01");
  await addSubscription(database, thandi, espresso, "monthly", "2026-11-01");
  await addSubscription(database, sipho, lamb, "monthly", "2026-11-02");
  return { database, karoo, coffee, thandi, sipho };
}

describe("a Customer's Charges", () => {
  it("lists only their own, newest first, with the Product, Vendor, amount and date", async () => {
    const { database, karoo, coffee, thandi, sipho } = await twoVendorsTwoCustomers();
    await shipAllDue(database, karoo, "2026-11-03");
    await shipAllDue(database, coffee, "2026-11-04");
    await shipAllDue(database, karoo, "2026-11-09");

    expect(await listCustomerCharges(database, thandi)).toEqual([
      {
        id: expect.any(Number),
        productName: "Free-range eggs",
        vendorName: "Karoo Farm",
        amountCents: 9950,
        amount: "R 99,50",
        chargedOn: "2026-11-09",
      },
      {
        id: expect.any(Number),
        productName: "House espresso",
        vendorName: "Cape Town Coffee Roasters",
        amountCents: 18500,
        amount: "R 185,00",
        chargedOn: "2026-11-04",
      },
      {
        id: expect.any(Number),
        productName: "Free-range eggs",
        vendorName: "Karoo Farm",
        amountCents: 9950,
        amount: "R 99,50",
        chargedOn: "2026-11-03",
      },
    ]);
    expect(await listCustomerCharges(database, sipho)).toMatchObject([
      { productName: "Karoo lamb box", chargedOn: "2026-11-03" },
    ]);
  });

  it("lists Charges made on the same day latest first", async () => {
    const { database, karoo, coffee, thandi } = await twoVendorsTwoCustomers();
    await shipAllDue(database, coffee, "2026-11-04");
    await shipAllDue(database, karoo, "2026-11-04");

    expect(await listCustomerCharges(database, thandi)).toMatchObject([
      { productName: "Free-range eggs" },
      { productName: "House espresso" },
    ]);
  });

  it("is empty before anything ships", async () => {
    const { database, thandi } = await twoVendorsTwoCustomers();

    expect(await listCustomerCharges(database, thandi)).toEqual([]);
  });
});

describe("a Vendor's Charges", () => {
  it("lists the Charges for their Products only, newest first", async () => {
    const { database, karoo, coffee } = await twoVendorsTwoCustomers();
    await shipAllDue(database, karoo, "2026-11-03");
    await shipAllDue(database, coffee, "2026-11-04");
    await shipAllDue(database, karoo, "2026-11-09");

    expect(await listVendorCharges(database, karoo)).toEqual([
      {
        id: expect.any(Number),
        productName: "Free-range eggs",
        customerEmail: "thandi@example.test",
        amountCents: 9950,
        amount: "R 99,50",
        chargedOn: "2026-11-09",
      },
      {
        id: expect.any(Number),
        productName: "Karoo lamb box",
        customerEmail: "sipho@example.test",
        amountCents: 45000,
        amount: "R 450,00",
        chargedOn: "2026-11-03",
      },
      {
        id: expect.any(Number),
        productName: "Free-range eggs",
        customerEmail: "thandi@example.test",
        amountCents: 9950,
        amount: "R 99,50",
        chargedOn: "2026-11-03",
      },
    ]);
    expect(await listVendorCharges(database, coffee)).toMatchObject([
      { productName: "House espresso", customerEmail: "thandi@example.test" },
    ]);
  });
});
