import { eq } from "drizzle-orm";
import { accounts, type AccountKind } from "~/db/schema";
import type { MarketplaceDatabase } from "~/modules/vendors";

/**
 * A signed-in person: exactly one of a Customer, a Vendor or an Admin. A
 * Vendor Account carries the id of its Vendor.
 */
export type Account =
  | { id: number; email: string; kind: "customer" }
  | { id: number; email: string; kind: "vendor"; vendorId: number }
  | { id: number; email: string; kind: "admin" };

/** The Account of one kind, e.g. `AccountOf<"vendor">`. */
export type AccountOf<K extends AccountKind> = Extract<Account, { kind: K }>;

type AccountRow = typeof accounts.$inferSelect;

export function toAccount(row: AccountRow): Account {
  const { id, email, kind, vendorId } = row;
  if (kind === "vendor") {
    // The schema's check constraint guarantees a Vendor Account has a Vendor.
    return { id, email, kind, vendorId: vendorId! };
  }
  return { id, email, kind };
}

export async function accountRowByEmail(
  database: MarketplaceDatabase,
  email: string,
): Promise<AccountRow | undefined> {
  return database.select().from(accounts).where(eq(accounts.email, email)).get();
}

/** The Account with this id, or null when there is none (e.g. it was deleted). */
export async function findAccount(
  database: MarketplaceDatabase,
  id: number,
): Promise<Account | null> {
  const row = await database.select().from(accounts).where(eq(accounts.id, id)).get();
  return row ? toAccount(row) : null;
}
