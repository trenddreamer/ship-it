import { and, eq } from "drizzle-orm";
import { accounts, vendors } from "~/db/schema";
import { sendNotification } from "~/modules/notifications";
import { z } from "zod";
import type { MarketplaceDatabase } from "~/db/database";

/** The Admin's decision form: which Vendor, and the approval status it gets. */
export const vendorDecisionSchema = z.object({
  vendorId: z.coerce.number().int().positive(),
  decision: z.enum(["approved", "rejected"]),
});

/** An Admin's decision on a pending Vendor: the approval status it gets. */
export type VendorDecision = z.infer<typeof vendorDecisionSchema>;

export type DecideVendorResult =
  { ok: true } | { ok: false; error: "not-found" | "already-decided" };

/**
 * Approves or rejects a pending Vendor and tells the Vendor, in its Inbox,
 * in the same transaction. A decision is final: a Vendor already approved or
 * rejected is refused ("already-decided") and nothing changes.
 */
export async function decideVendor(
  database: MarketplaceDatabase,
  { vendorId, decision }: VendorDecision,
): Promise<DecideVendorResult> {
  return database.transaction(async (tx): Promise<DecideVendorResult> => {
    // Only a pending Vendor changes, so two Admins deciding at once can't
    // both succeed: the second finds it no longer pending.
    const decided = await tx
      .update(vendors)
      .set({ approvalStatus: decision })
      .where(and(eq(vendors.id, vendorId), eq(vendors.approvalStatus, "pending")))
      .returning({ name: vendors.name })
      .all();
    const vendor = decided[0];
    if (!vendor) {
      const existing = await tx
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.id, vendorId))
        .all();
      return { ok: false, error: existing.length > 0 ? "already-decided" : "not-found" };
    }

    const vendorAccounts = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.vendorId, vendorId))
      .all();
    for (const account of vendorAccounts) {
      await sendNotification(tx, account.id, {
        kind: decision === "approved" ? "vendor-approved" : "vendor-rejected",
        vendorName: vendor.name,
      });
    }
    return { ok: true };
  });
}
