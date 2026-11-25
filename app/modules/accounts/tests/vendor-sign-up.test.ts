import { describe, expect, it } from "vitest";
import { findVendor, listApprovedVendors } from "~/modules/vendors";
import { countUnread, openInbox } from "~/modules/notifications";
import { ensureFirstAdmin, signIn, signUpCustomer, signUpVendor } from "../index";
import { freshDatabase } from "~/db/fresh-database";

const karoo = {
  email: "sipho@karoo.example",
  password: "lambs and eggs",
  businessName: "Karoo Farm",
  description: "Free-range eggs from Graaff-Reinet.",
};

describe("signing up as a Vendor", () => {
  it("creates the Account and its Vendor together, the Vendor pending", async () => {
    const database = await freshDatabase();

    const result = await signUpVendor(database, karoo);

    expect(result).toEqual({
      ok: true,
      account: {
        id: expect.any(Number),
        email: "sipho@karoo.example",
        kind: "vendor",
        vendorId: expect.any(Number),
      },
    });
    if (!result.ok || result.account.kind !== "vendor") throw new Error("not a Vendor Account");
    expect(await findVendor(database, result.account.vendorId)).toEqual({
      id: result.account.vendorId,
      name: "Karoo Farm",
      description: "Free-range eggs from Graaff-Reinet.",
      approvalStatus: "pending",
    });
    expect(await listApprovedVendors(database)).toEqual([]);
  });

  it("lets the Vendor sign in", async () => {
    const database = await freshDatabase();
    const signedUp = await signUpVendor(database, karoo);

    expect(
      await signIn(database, { email: "sipho@karoo.example", password: "lambs and eggs" }),
    ).toEqual(signedUp);
  });

  it("tells every Admin a Vendor is awaiting approval", async () => {
    const database = await freshDatabase();
    const adminLogin = { email: "admin@example.test", password: "admin password" };
    await ensureFirstAdmin(database, adminLogin);
    const admin = await signIn(database, adminLogin);
    if (!admin.ok) throw new Error("no Admin");
    const customer = await signUpCustomer(database, {
      email: "thandi@example.test",
      password: "a customer",
    });

    await signUpVendor(database, karoo);

    expect(await openInbox(database, admin.account.id)).toEqual([
      expect.objectContaining({
        kind: "vendor-awaiting-approval",
        message: "Karoo Farm signed up as a Vendor and is awaiting approval.",
        unread: true,
      }),
    ]);
    if (!customer.ok) throw new Error("no Customer");
    expect(await countUnread(database, customer.account.id)).toBe(0);
  });

  it("refuses a taken email and creates no Vendor", async () => {
    const database = await freshDatabase();
    await signUpCustomer(database, { email: "sipho@karoo.example", password: "a customer" });

    const result = await signUpVendor(database, karoo);

    expect(result).toEqual({ ok: false, error: "email-taken" });
    expect(await findVendor(database, 1)).toBeNull();
  });
});
