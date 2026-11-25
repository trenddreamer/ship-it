import { describe, expect, it } from "vitest";
import { findVendor } from "../index";
import { addVendor, freshDatabase } from "./database";

describe("findVendor", () => {
  it("finds a Vendor by id, whatever its approval status", async () => {
    const database = await freshDatabase();
    await addVendor(database, "Approved Co", "approved");
    const pending = await addVendor(database, "Pending Co", "pending");

    expect(await findVendor(database, pending)).toEqual({
      id: pending,
      name: "Pending Co",
      description: "Pending Co description",
      approvalStatus: "pending",
    });
  });

  it("gives null when there is no such Vendor", async () => {
    expect(await findVendor(await freshDatabase(), 42)).toBeNull();
  });
});
