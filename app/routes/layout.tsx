import { useRef, useState } from "react";
import { Link, NavLink, Outlet, useFetcher, useLocation, useMatches } from "react-router";
import { currentAccount } from "~/accounts.server";
import { AccountMenu } from "~/components/account-menu";
import { InboxIcon, linkIcons } from "~/components/nav-icons";
import { ThemeToggle } from "~/components/theme-toggle";
import { db } from "~/db/client.server";
import { landingPath } from "~/modules/accounts/server";
import { feedbackTextLength } from "~/modules/feedback";
import { headerNav } from "~/modules/navigation";
import { countUnread } from "~/modules/notifications";
import type { Route } from "./+types/layout";
import type { action as feedbackAction } from "./feedback";

// The layout every page sits in: a header with the Account's own links, their
// Inbox with its unread badge, an account menu and the theme icon, and, for a
// signed-in Account, the Feedback button. The header fits a 320px phone.
// Add things every signed-in page shows to this loader.
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

// Header links are round, and shaded on hover and on the page they lead to.
// A labelled one widens for its label once the label shows.
const shaded = ({ isActive }: { isActive: boolean }) => (isActive ? "bg-line font-medium" : "");
const labelled = (state: { isActive: boolean }) =>
  `flex items-center gap-1.5 rounded-full p-2 hover:bg-line sm:px-3 ${shaded(state)}`;
const iconOnly = (state: { isActive: boolean }) =>
  `relative flex rounded-full p-2 hover:bg-line ${shaded(state)}`;

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  // Opening the Inbox marks everything in it read, but this loader runs
  // alongside the Inbox's, so it may have counted first. On the Inbox,
  // nothing is unread.
  const inInbox = useMatches().some((match) => match.id === "routes/inbox");
  const nav = account && headerNav({ ...account, unread: inInbox ? 0 : account.unread });
  return (
    <>
      <header className="border-b border-line">
        <nav className="mx-auto flex h-14 max-w-3xl items-center gap-0.5 px-3 sm:gap-1 sm:px-8">
          <Link to="/" className="mr-auto font-semibold tracking-tight sm:text-lg">
            Marketplace
          </Link>
          {nav ? (
            <>
              {nav.links.map(({ to, label, icon }) => {
                const Icon = linkIcons[icon];
                return (
                  <NavLink key={to} to={to} title={label} className={labelled}>
                    <Icon />
                    <span className="sr-only sm:not-sr-only">{label}</span>
                  </NavLink>
                );
              })}
              <NavLink
                to={nav.inbox.to}
                aria-label={nav.inbox.label}
                title={nav.inbox.label}
                className={iconOnly}
              >
                <InboxIcon />
                {nav.inbox.badge && (
                  <span
                    aria-hidden
                    className="absolute right-0 top-0.5 min-w-[1.125rem] rounded-full bg-accent px-1 text-center text-[0.6875rem] font-semibold leading-[1.125rem] text-on-accent"
                  >
                    {nav.inbox.badge}
                  </span>
                )}
              </NavLink>
              <AccountMenu email={nav.account.email} kindName={nav.account.kindName} />
            </>
          ) : (
            <>
              <Link to="/sign-in" className="rounded-full px-3 py-2 hover:bg-line">
                Sign in
              </Link>
              <Link to="/sign-up" className="rounded-full bg-primary px-3 py-1.5 text-on-primary">
                Sign up
              </Link>
            </>
          )}
          <ThemeToggle />
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
  const [formGeneration, setFormGeneration] = useState(0);
  const fetcher = useFetcher<typeof feedbackAction>({ key: `feedback-${formGeneration}` });
  const { pathname } = useLocation();
  const result = fetcher.state === "idle" ? fetcher.data : undefined;
  function open() {
    if (result?.kind === "sent") setFormGeneration((n) => n + 1);
    dialog.current?.showModal();
  }
  return (
    <>
      <button
        type="button"
        onClick={open}
        className="fixed bottom-4 right-4 rounded-full bg-primary px-4 py-2 text-on-primary shadow-lg"
      >
        Feedback
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="feedback-heading"
        className="fixed inset-auto bottom-16 right-4 m-0 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-line p-4 shadow-xl backdrop:bg-black/20"
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
          <fetcher.Form
            key={formGeneration}
            method="post"
            action="/feedback"
            className="mt-3 space-y-3"
          >
            <input type="hidden" name="page" value={pathname} />
            <label className="block">
              <span className="text-muted">What's wrong, or what could be better?</span>
              <textarea
                name="text"
                required
                minLength={feedbackTextLength.min}
                maxLength={feedbackTextLength.max}
                rows={5}
                className="mt-1 block w-full rounded border border-line-strong p-2"
              />
            </label>
            {result?.kind === "invalid" && (
              <p role="alert" className="text-danger">
                {result.reason}
              </p>
            )}
            {result?.kind === "failed" && (
              <p role="alert" className="text-danger">
                Couldn't send your feedback. Try again in a moment.
              </p>
            )}
            <button
              type="submit"
              disabled={fetcher.state !== "idle"}
              className="rounded bg-primary px-4 py-2 text-on-primary"
            >
              {fetcher.state === "idle" ? "Send Feedback" : "Sending…"}
            </button>
          </fetcher.Form>
        )}
      </dialog>
    </>
  );
}
