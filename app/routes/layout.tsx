import { useRef, useState } from "react";
import { Form, Link, Outlet, useFetcher, useLocation, useMatches } from "react-router";
import { currentAccount } from "~/accounts.server";
import { db } from "~/db/client.server";
import { landingPath } from "~/modules/accounts/server";
import { countUnread } from "~/modules/notifications";
import type { Route } from "./+types/layout";
import type { action as feedbackAction } from "./feedback";

// The layout every page sits in: a header with who is signed in and their
// Inbox's unread count, and, for a signed-in Account, the Feedback button. Add things every signed-in page shows to this loader.
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
      {account ? (
        // Room at the end of every page, so the Feedback button covers nothing.
        <div className="pb-20">
          <Outlet />
        </div>
      ) : (
        <Outlet />
      )}
      {account && <Feedback />}
    </>
  );
}

// The Feedback button, fixed in the bottom-right corner, and the dialog it
// opens, which rises from that corner. Esc closes it (the browser does that
// for a modal <dialog>). It posts with a fetcher, so sending never leaves the
// page, and the page sent is where it was opened, never typed.
function Feedback() {
  const dialog = useRef<HTMLDialogElement>(null);
  // Each sending gets a fresh fetcher: reopening the dialog after the thanks
  // starts an empty form again.
  const [round, setRound] = useState(0);
  const fetcher = useFetcher<typeof feedbackAction>({ key: `feedback-${round}` });
  const { pathname } = useLocation();
  const result = fetcher.state === "idle" ? fetcher.data : undefined;
  function open() {
    if (result?.kind === "sent") setRound((n) => n + 1);
    dialog.current?.showModal();
  }
  return (
    <>
      <button
        type="button"
        onClick={open}
        className="fixed bottom-4 right-4 rounded-full bg-gray-900 px-4 py-2 text-white shadow-lg"
      >
        Feedback
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="feedback-heading"
        className="fixed inset-auto bottom-16 right-4 m-0 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-gray-200 p-4 shadow-xl backdrop:bg-black/20"
      >
        <div className="flex items-center">
          <h2 id="feedback-heading" className="flex-1 font-semibold">
            Feedback
          </h2>
          <button type="button" onClick={() => dialog.current?.close()} className="underline">
            Close
          </button>
        </div>
        {result?.kind === "sent" ? (
          <p role="status" className="mt-3">
            Thanks, the Factory is looking at it.
            {result.issueUrl && (
              <>
                {" "}
                <a href={result.issueUrl} target="_blank" rel="noreferrer">
                  See the issue
                </a>
                .
              </>
            )}
          </p>
        ) : (
          <fetcher.Form key={round} method="post" action="/feedback" className="mt-3 space-y-3">
            <input type="hidden" name="page" value={pathname} />
            <label className="block">
              <span className="text-gray-600">What's wrong, or what could be better?</span>
              <textarea
                name="text"
                required
                minLength={10}
                maxLength={2000}
                rows={5}
                className="mt-1 block w-full rounded border border-gray-300 p-2"
              />
            </label>
            {result?.kind === "invalid" && (
              <p role="alert" className="text-red-700">
                {result.reason}
              </p>
            )}
            {result?.kind === "failed" && (
              <p role="alert" className="text-red-700">
                Couldn't send your feedback. Try again in a moment.
              </p>
            )}
            <button
              type="submit"
              disabled={fetcher.state !== "idle"}
              className="rounded bg-gray-900 px-4 py-2 text-white"
            >
              {fetcher.state === "idle" ? "Send Feedback" : "Sending…"}
            </button>
          </fetcher.Form>
        )}
      </dialog>
    </>
  );
}
