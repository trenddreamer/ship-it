import { describe, expect, it } from "vitest";
import { formatPrice } from "~/modules/price";
import { listApprovedVendors } from "../index";
import { addProduct, addVendor, freshDatabase } from "./database";

describe("listApprovedVendors", () => {
  it("returns nothing when there are no Vendors", () => {
    expect(listApprovedVendors(freshDatabase())).toEqual([]);
  });

  it("shows approved Vendors with their Products, Price in rands", () => {
    const database = freshDatabase();
    const farm = addVendor(database, "Karoo Farm", "approved");
    addProduct(database, farm, "Free-range eggs", 6500);
    addProduct(database, farm, "Lamb box", 150000);

    const shown = listApprovedVendors(database);

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

  it("keeps an approved Vendor with no Products, with an empty list", () => {
    const database = freshDatabase();
    addVendor(database, "Empty Pantry", "approved");

    expect(listApprovedVendors(database)).toEqual([
      expect.objectContaining({ name: "Empty Pantry", products: [] }),
    ]);
  });

  it("never shows pending or rejected Vendors, or their Products", () => {
    const database = freshDatabase();
    const approved = addVendor(database, "Approved Co", "approved");
    const pending = addVendor(database, "Pending Co", "pending");
    const rejected = addVendor(database, "Rejected Co", "rejected");
    addProduct(database, approved, "Shown", 1000);
    addProduct(database, pending, "Hidden pending", 1000);
    addProduct(database, rejected, "Hidden rejected", 1000);

    const shown = listApprovedVendors(database);

    expect(shown.map((v) => v.name)).toEqual(["Approved Co"]);
    expect(shown.flatMap((v) => v.products.map((p) => p.name))).toEqual(["Shown"]);
  });

  it("gives each approved Vendor only its own Products, Vendors ordered by name", () => {
    const database = freshDatabase();
    const zulu = addVendor(database, "Zulu Coffee", "approved");
    const amber = addVendor(database, "Amber Bakery", "approved");
    addProduct(database, zulu, "Espresso beans", 18000);
    addProduct(database, amber, "Sourdough", 7500);

    const shown = listApprovedVendors(database);

    expect(shown.map((v) => [v.name, v.products.map((p) => p.name)])).toEqual([
      ["Amber Bakery", ["Sourdough"]],
      ["Zulu Coffee", ["Espresso beans"]],
    ]);
  });
});
