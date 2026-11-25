import { describe, expect, it } from "vitest";
import { formatPrice } from "~/modules/price";
import { listApprovedVendors } from "../index";
import { addProduct, addVendor, freshDatabase } from "./database";

describe("listApprovedVendors", () => {
  it("returns nothing when there are no Vendors", async () => {
    expect(await listApprovedVendors(await freshDatabase())).toEqual([]);
  });

  it("shows approved Vendors with their Products, Price in rands", async () => {
    const database = await freshDatabase();
    const farm = await addVendor(database, "Karoo Farm", "approved");
    await addProduct(database, farm, "Free-range eggs", 6500);
    await addProduct(database, farm, "Lamb box", 150000);

    const shown = await listApprovedVendors(database);

    expect(shown).toHaveLength(1);
    const vendor = shown[0]!;
    expect(vendor.name).toBe("Karoo Farm");
    expect(vendor.description).toBe("Karoo Farm description");
    expect(vendor.products).toEqual([
      expect.objectContaining({
        name: "Free-range eggs",
        priceCents: 6500,
        price: formatPrice(6500),
      }),
      expect.objectContaining({ name: "Lamb box", priceCents: 150000, price: formatPrice(150000) }),
    ]);
    expect(vendor.products[0]?.description).toBe("Free-range eggs description");
  });

  it("keeps an approved Vendor with no Products, with an empty list", async () => {
    const database = await freshDatabase();
    await addVendor(database, "Empty Pantry", "approved");

    expect(await listApprovedVendors(database)).toEqual([
      expect.objectContaining({ name: "Empty Pantry", products: [] }),
    ]);
  });

  it("never shows pending or rejected Vendors, or their Products", async () => {
    const database = await freshDatabase();
    const approved = await addVendor(database, "Approved Co", "approved");
    const pending = await addVendor(database, "Pending Co", "pending");
    const rejected = await addVendor(database, "Rejected Co", "rejected");
    await addProduct(database, approved, "Shown", 1000);
    await addProduct(database, pending, "Hidden pending", 1000);
    await addProduct(database, rejected, "Hidden rejected", 1000);

    const shown = await listApprovedVendors(database);

    expect(shown.map((v) => v.name)).toEqual(["Approved Co"]);
    expect(shown.flatMap((v) => v.products.map((p) => p.name))).toEqual(["Shown"]);
  });

  it("gives each approved Vendor only its own Products, Vendors ordered by name", async () => {
    const database = await freshDatabase();
    const zulu = await addVendor(database, "Zulu Coffee", "approved");
    const amber = await addVendor(database, "Amber Bakery", "approved");
    await addProduct(database, zulu, "Espresso beans", 18000);
    await addProduct(database, amber, "Sourdough", 7500);

    const shown = await listApprovedVendors(database);

    expect(shown.map((v) => [v.name, v.products.map((p) => p.name)])).toEqual([
      ["Amber Bakery", ["Sourdough"]],
      ["Zulu Coffee", ["Espresso beans"]],
    ]);
  });
});
