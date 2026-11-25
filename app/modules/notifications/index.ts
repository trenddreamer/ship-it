// Entry point: Notifications and the Inbox. Other modules send a Notification
// inside their own transaction (pass `tx`); routes open an Inbox and show the
// unread count. To add a kind of Notification, see ./lib/kinds.ts.
export type { DatabaseOrTransaction } from "./lib/database";
export type { NewNotification, NotificationKind } from "./lib/kinds";
export { openInbox, sendNotification, type Notification } from "./lib/inbox";
