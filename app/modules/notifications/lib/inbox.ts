import { and, count, desc, eq, inArray } from "drizzle-orm";
import { accounts, notifications } from "~/db/schema";
import type { DatabaseOrTransaction } from "./database";
import { messageFor, type NewNotification, type NotificationKind } from "./kinds";

/** A Notification as its Inbox shows it. */
export type Notification = {
  id: number;
  kind: NotificationKind;
  message: string;
  sentAt: Date;
  /** Whether it was unread when the Inbox was opened. */
  unread: boolean;
};

/**
 * Puts a Notification in an Account's Inbox, unread. Pass a transaction to
 * send it in the same transaction as the change it reports.
 */
export async function sendNotification(
  database: DatabaseOrTransaction,
  accountId: number,
  notification: NewNotification,
): Promise<void> {
  await database
    .insert(notifications)
    .values({
      accountId,
      kind: notification.kind,
      message: messageFor(notification),
      sentAt: new Date(),
    })
    .run();
}

/**
 * Puts a Notification in every Admin's Inbox, unread. Pass a transaction to
 * send it in the same transaction as the change it reports.
 */
export async function notifyAdmins(
  database: DatabaseOrTransaction,
  notification: NewNotification,
): Promise<void> {
  const admins = await database
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.kind, "admin"))
    .all();
  for (const admin of admins) await sendNotification(database, admin.id, notification);
}

/**
 * Opens an Account's Inbox: its Notifications, newest first, each marked
 * `unread` if it was unread until now. Opening it marks them all read.
 */
export async function openInbox(
  database: DatabaseOrTransaction,
  accountId: number,
): Promise<Notification[]> {
  const rows = await database
    .select()
    .from(notifications)
    .where(eq(notifications.accountId, accountId))
    .orderBy(desc(notifications.id))
    .all();
  // Only the ones listed: one sent since the select stays unread.
  const unreadIds = rows.filter((row) => !row.read).map((row) => row.id);
  await database
    .update(notifications)
    .set({ read: true })
    .where(inArray(notifications.id, unreadIds))
    .run();
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind as NotificationKind,
    message: row.message,
    sentAt: row.sentAt,
    unread: !row.read,
  }));
}

/** How many Notifications in an Account's Inbox are unread. */
export async function countUnread(
  database: DatabaseOrTransaction,
  accountId: number,
): Promise<number> {
  const [row] = await database
    .select({ unread: count() })
    .from(notifications)
    .where(and(eq(notifications.accountId, accountId), eq(notifications.read, false)))
    .all();
  return row!.unread;
}
