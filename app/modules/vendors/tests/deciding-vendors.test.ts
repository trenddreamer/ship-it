import { describe, expect, it } from "vitest";
import { signUpVendor } from "~/modules/accounts";
import { countUnread, openInbox } from "~/modules/notifications";
import { decideVendor, findVendor, listApprovedVendors, type MarketplaceDatabase } from "../index";
import { freshDatabase } from "./database";

/** Signs a Vendor up the way a visitor does; returns its Vendor and Account ids. */
async function signedUpVendor(database: MarketplaceDatabase, businessName: string) {
  const result = await signUpVendor(database, {
    email: `${businessName.toLowerCase().replaceAll(" ", "-")}@example.test`,
    password: "vendor-password",
    businessName,
    description: `${businessName} description`,
  });
  if (!result.ok || result.account.kind !== "vendor") throw new Error("sign-up failed");
  return { vendorId: result.account.vendorId, accountId: result.account.id };
}

describe("deciding a pending Vendor", () => {
  it("approving shows the Vendor to Customers and tells the Vendor", async () => {
    const database = await freshDatabase();
    const { vendorId, accountId } = await signedUpVendor(database, "Karoo Farm");

    expect(await decideVendor(database, { vendorId, decision: "approved" })).toEqual({ ok: true });

    expect((await listApprovedVendors(database)).map((v) => v.name)).toEqual(["Karoo Farm"]);
    expect((await openInbox(database, accountId)).map((n) => n.message)).toEqual([
      "An Admin approved Karoo Farm. Customers can now see it and its Products.",
    ]);
  });

  it("rejecting keeps the Vendor from Customers and tells the Vendor", async () => {
    const database = await freshDatabase();
    const { vendorId, accountId } = await signedUpVendor(database, "Garden Honey");

    expect(await decideVendor(database, { vendorId, decision: "rejected" })).toEqual({ ok: true });

    expect(await listApprovedVendors(database)).toEqual([]);
    expect(await findVendor(database, vendorId)).toEqual(
      expect.objectContaining({ approvalStatus: "rejected" }),
    );
    expect((await openInbox(database, accountId)).map((n) => n.message)).toEqual([
      "An Admin rejected Garden Honey. Customers can't see it, and it can't apply again.",
    ]);
  });
});

describe("a Vendor that isn't pending", () => {
  it.each([
    ["approved", "rejected"],
    ["rejected", "approved"],
    ["approved", "approved"],
    ["rejected", "rejected"],
  ] as const)("once %s, can't be %s, and isn't told again", async (first, second) => {
    const database = await freshDatabase();
    const { vendorId, accountId } = await signedUpVendor(database, "Karoo Farm");
    await decideVendor(database, { vendorId, decision: first });
    await openInbox(database, accountId);

    expect(await decideVendor(database, { vendorId, decision: second })).toEqual({
      ok: false,
      error: "already-decided",
    });

    expect(await findVendor(database, vendorId)).toEqual(
      expect.objectContaining({ approvalStatus: first }),
    );
    expect(await countUnread(database, accountId)).toBe(0);
  });

  it("can't be decided when there is no such Vendor", async () => {
    const database = await freshDatabase();

    expect(await decideVendor(database, { vendorId: 42, decision: "approved" })).toEqual({
      ok: false,
      error: "not-found",
    });
  });
});
