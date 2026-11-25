import { Form, Link, Outlet } from "react-router";
import { currentAccount } from "~/accounts.server";
import { landingPath } from "~/modules/accounts/server";
import type { Route } from "./+types/layout";

// The layout every page sits in: a header with who is signed in. Add things
// every signed-in page shows (e.g. the Inbox's unread count) to this loader.
export async function loader({ request }: Route.LoaderArgs) {
  const account = await currentAccount(request);
  return {
    account: account && { email: account.email, kind: account.kind, home: landingPath(account) },
  };
}

const kindNames = { customer: "Customer", vendor: "Vendor", admin: "Admin" } as const;

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
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
