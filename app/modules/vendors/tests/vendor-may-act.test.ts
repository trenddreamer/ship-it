import { describe, expect, it } from "vitest";
import { vendorMayAct } from "../index";
import { addVendor, freshDatabase } from "./database";

describe("vendorMayAct", () => {
  it("lets a pending or an approved Vendor act", async () => {
    const database = await freshDatabase();
    const pending = await addVendor(database, "Pending Co", "pending");
    const approved = await addVendor(database, "Approved Co", "approved");

    expect(await vendorMayAct(database, pending)).toBe(true);
    expect(await vendorMayAct(database, approved)).toBe(true);
  });

  it("refuses a rejected Vendor", async () => {
    const database = await freshDatabase();
    const rejected = await addVendor(database, "Rejected Co", "rejected");

    expect(await vendorMayAct(database, rejected)).toBe(false);
  });

  it("refuses a Vendor that doesn't exist", async () => {
    expect(await vendorMayAct(await freshDatabase(), 42)).toBe(false);
  });
});
