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
  /** To a Vendor, when a Customer cancels a Subscription to one of its Products. */
  "subscription-cancelled": ({
    customerEmail,
    productName,
  }: {
    customerEmail: string;
    productName: string;
  }) => `${customerEmail} cancelled their Subscription to ${productName}.`,
  /** To a Customer, when the Vendor stops selling the Product they subscribe to. */
  "product-stopped": ({ vendorName, productName }: { vendorName: string; productName: string }) =>
    `${vendorName} cancelled your Subscription to ${productName}: it stopped selling it.`,
  /** To a Customer, when the Vendor stops offering their Subscription's Delivery Schedule. */
  "delivery-schedule-stopped": ({
    vendorName,
    productName,
    scheduleLabel,
  }: {
    vendorName: string;
    productName: string;
    /** The Delivery Schedule as shown to people, e.g. "Every two weeks". */
    scheduleLabel: string;
  }) =>
    `${vendorName} cancelled your Subscription to ${productName}: it stopped delivering it ${scheduleLabel.toLowerCase()}.`,
  /** To a Customer, when a Vendor marks one of their Deliveries shipped (and charges it). */
  "delivery-shipped": ({
    vendorName,
    productName,
    dueOn,
    amount,
  }: {
    vendorName: string;
    productName: string;
    /** The day it fell due, as shown to people, e.g. "2 November 2026". */
    dueOn: string;
    /** The Charge's amount, formatted with `formatPrice`. */
    amount: string;
  }) => `${vendorName} shipped your ${productName}, due ${dueOn}. You were charged ${amount}.`,
  /** To a Customer subscribed to a Product, when its Vendor changes its Price. */
  "price-changed": ({
    vendorName,
    productName,
    oldPrice,
    newPrice,
    takesEffectOn,
  }: {
    vendorName: string;
    productName: string;
    /** The Prices, formatted with `formatPrice`. */
    oldPrice: string;
    newPrice: string;
    /** The first day Deliveries fall due at the new Price, e.g. "17 November 2026". */
    takesEffectOn: string;
  }) =>
    `${vendorName} changed the Price of ${productName} from ${oldPrice} to ${newPrice}. ` +
    `The new Price takes effect on ${takesEffectOn}.`,
};

type Kinds = typeof kinds;

/** What a Notification reports, e.g. `"vendor-awaiting-approval"`. */
export type NotificationKind = keyof Kinds;

/** The details each kind's message needs. */
type Details = { [K in NotificationKind]: Parameters<Kinds[K]>[0] };

/** A Notification to send: its kind, plus the details that kind's message needs. */
export type NewNotification = {
  [K in NotificationKind]: { kind: K } & Details[K];
}[NotificationKind];

// The same functions, typed per kind, so `messageFor` can call the one that
// matches the Notification's kind (TypeScript's "correlated union" pattern).
const messages: { [K in NotificationKind]: (details: Details[K]) => string } = kinds;

export function messageFor<K extends NotificationKind>(
  notification: { kind: K } & Details[K],
): string {
  return messages[notification.kind](notification);
}
