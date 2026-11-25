import { requireAccount } from "~/accounts.server";
import { db } from "~/db/client.server";
import { openInbox } from "~/modules/notifications";
import type { Route } from "./+types/inbox";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Inbox · Marketplace" }];
}

// The Marketplace is in South Africa: show times there, the same on the
// server and in the browser.
const sentAtFormat = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Johannesburg",
});

// Opening the Inbox marks its Notifications read.
export async function loader({ request }: Route.LoaderArgs) {
  const account = await requireAccount(request, "customer", "vendor", "admin");
  const notifications = await openInbox(db, account.id);
  return {
    notifications: notifications.map((notification) => ({
      id: notification.id,
      message: notification.message,
      sentAt: notification.sentAt.toISOString(),
      sentAtText: sentAtFormat.format(notification.sentAt),
      unread: notification.unread,
    })),
  };
}

export default function InboxPage({ loaderData }: Route.ComponentProps) {
  const { notifications } = loaderData;
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">Inbox</h1>
      {notifications.length === 0 ? (
        <p className="mt-6 text-gray-600">No Notifications yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-200 border-y border-gray-200">
          {notifications.map((notification) => (
            <li key={notification.id} className="flex items-baseline gap-4 py-3">
              <span className={notification.unread ? "flex-1 font-semibold" : "flex-1"}>
                {notification.message}
              </span>
              {notification.unread && <span className="text-sm text-blue-700">New</span>}
              <time dateTime={notification.sentAt} className="text-sm text-gray-500">
                {notification.sentAtText}
              </time>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
