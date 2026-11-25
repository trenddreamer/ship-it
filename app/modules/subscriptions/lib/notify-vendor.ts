import { eq } from "drizzle-orm";
import { accounts } from "~/db/schema";
import {
  sendNotification,
  type DatabaseOrTransaction,
  type NewNotification,
} from "~/modules/notifications";

/** Sends a Notification to every Account of a Vendor, inside the caller's transaction. */
export async function notifyVendor(
  database: DatabaseOrTransaction,
  vendorId: number,
  notification: NewNotification,
): Promise<void> {
  const vendorAccounts = await database
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.vendorId, vendorId))
    .all();
  for (const vendorAccount of vendorAccounts) {
    await sendNotification(database, vendorAccount.id, notification);
  }
}
