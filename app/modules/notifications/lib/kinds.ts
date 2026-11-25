// The kinds of Notification, and the message each one shows.
//
// To add a kind: add an entry below. Its key is the kind (stored as text, so
// no migration is needed); its function takes what the sender knows and
// returns the message. `sendNotification` then accepts
// `{ kind: "<your-kind>", ...whatTheFunctionTakes }`, type-checked.
const kinds = {
  /** To every Admin, when a Vendor signs up. */
  "vendor-awaiting-approval": ({ vendorName }: { vendorName: string }) =>
    `${vendorName} signed up as a Vendor and is awaiting approval.`,
  /** To a Vendor, when an Admin approves it. */
  "vendor-approved": ({ vendorName }: { vendorName: string }) =>
    `An Admin approved ${vendorName}. Customers can now see it and its Products.`,
  /** To a Vendor, when an Admin rejects it. */
  "vendor-rejected": ({ vendorName }: { vendorName: string }) =>
    `An Admin rejected ${vendorName}. Customers can't see it, and it can't apply again.`,
  /** To a Vendor, when a Customer subscribes to one of its Products. */
  "new-subscription": ({
    customerEmail,
    productName,
    scheduleLabel,
  }: {
    customerEmail: string;
    productName: string;
    /** The Delivery Schedule as shown to people, e.g. "Every two weeks". */
    scheduleLabel: string;
  }) => `${customerEmail} subscribed to ${productName}, delivered ${scheduleLabel.toLowerCase()}.`,
};

type Kinds = typeof kinds;

/** What a Notification reports, e.g. `"vendor-awaiting-approval"`. */
export type NotificationKind = keyof Kinds;

/** A Notification to send: its kind, plus the details that kind's message needs. */
export type NewNotification = {
  [K in NotificationKind]: { kind: K } & Parameters<Kinds[K]>[0];
}[NotificationKind];

export function messageFor(notification: NewNotification): string {
  return kinds[notification.kind](notification);
}
