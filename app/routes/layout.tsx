import { Form, Link, Outlet, useMatches } from "react-router";
import { currentAccount } from "~/accounts.server";
import { db } from "~/db/client.server";
import { landingPath } from "~/modules/accounts/server";
import { countUnread } from "~/modules/notifications";
import type { Route } from "./+types/layout";

// The layout every page sits in: a header with who is signed in and their
// Inbox's unread count. Add things every signed-in page shows to this loader.
export async function loader({ request }: Route.LoaderArgs) {
  const account = await currentAccount(request);
  return {
    account: account && {
      email: account.email,
      kind: account.kind,
      home: landingPath(account),
      unread: await countUnread(db, account.id),
    },
  };
}

// The unread count changes without the URL changing (a Notification arrives,
// the Inbox is opened), so recount on every navigation, not only when params
// change.
export function shouldRevalidate() {
  return true;
}

const kindNames = { customer: "Customer", vendor: "Vendor", admin: "Admin" } as const;

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  // Opening the Inbox marks everything in it read, but this loader runs
  // alongside the Inbox's, so it may have counted first. On the Inbox,
  // nothing is unread.
  const inInbox = useMatches().some((match) => match.id === "routes/inbox");
  const unread = account && !inInbox ? account.unread : 0;
  return (
    <>
      <header className="border-b border-gray-200">
        <nav className="mx-auto flex max-w-3xl items-center gap-4 px-8 py-3">
          <Link to="/" className="font-semibold">
            Marketplace
          </Link>
          <span className="flex-1" />
          {account ? (
            <>
              {account.kind === "customer" && <Link to="/subscriptions">Your Subscriptions</Link>}
              {account.kind === "customer" && <Link to="/charges">Your Charges</Link>}
              <Link to="/inbox">
                Inbox
                {unread > 0 && <span className="font-semibold"> ({unread} unread)</span>}
              </Link>
              <Link to={account.home}>
                {account.email} ({kindNames[account.kind]})
              </Link>
              <Form method="post" action="/sign-out">
                <button type="submit" className="underline">
                  Sign out
                </button>
              </Form>
            </>
          ) : (
            <>
              <Link to="/sign-in">Sign in</Link>
              <Link to="/sign-up">Sign up</Link>
            </>
          )}
        </nav>
      </header>
      <Outlet />
    </>
  );
}
