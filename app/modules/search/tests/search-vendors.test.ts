import { describe, expect, it } from "vitest";
import { formatPrice } from "~/modules/price";
import { searchVendors } from "../index";
import { addProduct, addVendor, freshDatabase } from "./database";

describe("searchVendors", () => {
  it("finds the Vendor whose Product name matches the query", async () => {
    const database = await freshDatabase();
    const farm = await addVendor(database, "Karoo Farm", "approved");
    await addProduct(database, farm, "Free-range eggs", 6500);
    const coffee = await addVendor(database, "Cape Coffee", "approved");
    await addProduct(database, coffee, "Espresso beans", 18000);

    const found = await searchVendors(database, "eggs");

    expect(found.map((v) => v.name)).toEqual(["Karoo Farm"]);
  });

  it("ignores case in the query and in what it matches", async () => {
    const database = await freshDatabase();
    const farm = await addVendor(database, "Karoo Farm", "approved");
    await addProduct(database, farm, "Free-range EGGS", 6500);

    expect((await searchVendors(database, "eGgS")).map((v) => v.name)).toEqual(["Karoo Farm"]);
  });

  it.each([
    ["the Vendor's name", "roasters"],
    ["the Vendor's description", "woodstock"],
    ["a Product's description", "chocolatey"],
  ])("matches %s", async (_, query) => {
    const database = await freshDatabase();
    const coffee = await addVendor(
      database,
      "Cape Roasters",
      "approved",
      "Roasted weekly in Woodstock.",
    );
    await addProduct(database, coffee, "House blend", 21000, "Chocolatey and smooth.");
    const farm = await addVendor(database, "Karoo Farm", "approved", "Eggs and lamb.");
    await addProduct(database, farm, "Lamb box", 52500, "Mixed cuts.");

    expect((await searchVendors(database, query)).map((v) => v.name)).toEqual(["Cape Roasters"]);
  });

  it("needs every word to match, so more words narrow the results", async () => {
    const database = await freshDatabase();
    const farm = await addVendor(database, "Karoo Farm", "approved", "From Graaff-Reinet.");
    await addProduct(database, farm, "Free-range eggs", 6500);
    await addProduct(database, farm, "Lamb box", 52500);
    const coop = await addVendor(database, "Egg Co-op", "approved");
    await addProduct(database, coop, "Barn eggs", 5000);

    const names = async (query: string) =>
      (await searchVendors(database, query)).map((v) => v.name);

    expect(await names("eggs")).toEqual(["Egg Co-op", "Karoo Farm"]);
    // Each word may match a different Product, or the Vendor itself.
    expect(await names("  eggs   LAMB ")).toEqual(["Karoo Farm"]);
    expect(await names("graaff eggs")).toEqual(["Karoo Farm"]);
    expect(await names("eggs lamb honey")).toEqual([]);
  });

  it("matches a word within one name or description, never across two", async () => {
    const database = await freshDatabase();
    const farm = await addVendor(database, "Karoo", "approved", "Farm");
    await addProduct(database, farm, "Eggs", 6500, "Tray");

    expect(await searchVendors(database, "karoofarm")).toEqual([]);
    expect(await searchVendors(database, "farmeggs")).toEqual([]);
    expect(await searchVendors(database, "eggstray")).toEqual([]);
  });

  it("groups results by Vendor, each with all its Products and their Prices", async () => {
    const database = await freshDatabase();
    const farm = await addVendor(database, "Karoo Farm", "approved", "Family farm.");
    await addProduct(database, farm, "Free-range eggs", 6500, "A tray of eggs.");
    await addProduct(database, farm, "Lamb box", 150000);

    expect(await searchVendors(database, "eggs")).toEqual([
      {
        id: farm,
        name: "Karoo Farm",
        description: "Family farm.",
        products: [
          expect.objectContaining({
            name: "Free-range eggs",
            description: "A tray of eggs.",
            priceCents: 6500,
            price: formatPrice(6500),
          }),
          expect.objectContaining({
            name: "Lamb box",
            priceCents: 150000,
            price: formatPrice(150000),
          }),
        ],
      },
    ]);
  });

  it.each(["", "   "])("shows every approved Vendor for the empty search %j", async (query) => {
    const database = await freshDatabase();
    await addVendor(database, "Zulu Coffee", "approved");
    await addVendor(database, "Amber Bakery", "approved");
    await addVendor(database, "Pending Co", "pending");

    expect((await searchVendors(database, query)).map((v) => v.name)).toEqual([
      "Amber Bakery",
      "Zulu Coffee",
    ]);
  });

  it("never shows pending or rejected Vendors, or their Products", async () => {
    const database = await freshDatabase();
    const shown = await addVendor(database, "Honey Shop", "approved");
    await addProduct(database, shown, "Fynbos honey", 12000);
    const pending = await addVendor(database, "Pending Honey", "pending");
    await addProduct(database, pending, "Pending honey jar", 12000);
    const rejected = await addVendor(database, "Rejected Honey", "rejected");
    await addProduct(database, rejected, "Rejected honey jar", 12000);

    const found = await searchVendors(database, "honey");

    expect(found.map((v) => v.name)).toEqual(["Honey Shop"]);
    expect(found.flatMap((v) => v.products.map((p) => p.name))).toEqual(["Fynbos honey"]);
    expect(await searchVendors(database, "jar")).toEqual([]);
  });
});
