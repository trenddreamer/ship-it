interface ShownSubscription {
  id: number;
  customerEmail: string;
  /** The Delivery Schedule's label, e.g. "Monthly". */
  schedule: string;
  /** The next due date, formatted, e.g. "26 November 2026". */
  nextDue: string;
}

/** The active Subscriptions to one of a Vendor's Products, for the Vendor page. */
export function ProductSubscriptions({ subscriptions }: { subscriptions: ShownSubscription[] }) {
  const count = subscriptions.length;
  return (
    <div className="mt-2 text-sm">
      <p className="font-medium">
        {count === 0
          ? "No active Subscriptions"
          : `${count} active Subscription${count === 1 ? "" : "s"}`}
      </p>
      {count > 0 && (
        <ul className="mt-1 list-disc pl-5 text-muted">
          {subscriptions.map((subscription) => (
            <li key={subscription.id}>
              {subscription.customerEmail}: {subscription.schedule}, next Delivery due{" "}
              {subscription.nextDue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
