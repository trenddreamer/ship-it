import { describe, expect, it } from "vitest";
import { decideVendor, listPendingVendors } from "../index";
import { addVendor, freshDatabase } from "./database";

describe("listPendingVendors", () => {
  it("returns nothing when no Vendor is pending", async () => {
    const database = await freshDatabase();
    await addVendor(database, "Approved Co", "approved");
    await addVendor(database, "Rejected Co", "rejected");

    expect(await listPendingVendors(database)).toEqual([]);
  });

  it("lists only pending Vendors, with name and description, oldest sign-up first", async () => {
    const database = await freshDatabase();
    const zulu = await addVendor(database, "Zulu Coffee", "pending");
    await addVendor(database, "Approved Co", "approved");
    const amber = await addVendor(database, "Amber Bakery", "pending");
    await addVendor(database, "Rejected Co", "rejected");

    expect(await listPendingVendors(database)).toEqual([
      { id: zulu, name: "Zulu Coffee", description: "Zulu Coffee description" },
      { id: amber, name: "Amber Bakery", description: "Amber Bakery description" },
    ]);
  });

  it("drops a Vendor once it is decided", async () => {
    const database = await freshDatabase();
    const farm = await addVendor(database, "Karoo Farm", "pending");
    const honey = await addVendor(database, "Garden Honey", "pending");

    await decideVendor(database, { vendorId: farm, decision: "approved" });

    expect((await listPendingVendors(database)).map((v) => v.id)).toEqual([honey]);
  });
});
