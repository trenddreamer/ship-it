import { createCookieSessionStorage, redirect } from "react-router";
import type { AccountKind } from "~/db/schema";
import type { MarketplaceDatabase } from "~/db/database";
import { findAccount, type Account, type AccountOf } from "./account";

/** Where a visitor goes to sign in, when a page needs an Account. */
const signInPath = "/sign-in";

const landingPaths: Record<AccountKind, string> = {
  customer: "/",
  vendor: "/vendor",
  admin: "/admin",
};

/** The page an Account lands on after signing in: the Marketplace, the Vendor page or the Admin page. */
export function landingPath(account: Account): string {
  return landingPaths[account.kind];
}

export interface SessionOptions {
  /** Signs the session cookie. Anyone who knows it can forge a session. */
  secret: string;
  /** Send the cookie over HTTPS only. Off by default, for local http. */
  secure?: boolean;
}

/**
 * Sessions for signed-in Accounts, in a signed cookie, `__session` (React
 * Router's cookie session storage), that holds only the Account's id. Every loader and action
 * starts with `requireAccount` (or `currentAccount` on pages open to
 * visitors).
 */
export function createAccountSessions(database: MarketplaceDatabase, options: SessionOptions) {
  const storage = createCookieSessionStorage<{ accountId: number }>({
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: options.secure ?? false,
      secrets: [options.secret],
    },
  });

  async function currentAccount(request: Request): Promise<Account | null> {
    const session = await storage.getSession(request.headers.get("Cookie"));
    const id = session.get("accountId");
    return id === undefined ? null : findAccount(database, id);
  }

  return {
    /** The signed-in Account, or null for a visitor. */
    currentAccount,

    /**
     * The signed-in Account, when it is one of `kinds`. Otherwise throws: a
     * redirect to sign in for a visitor, a 403 for any other kind of Account.
     */
    async requireAccount<K extends AccountKind>(
      request: Request,
      ...kinds: [K, ...K[]]
    ): Promise<AccountOf<K>> {
      const account = await currentAccount(request);
      if (!account) throw redirect(signInPath);
      if (!(kinds as AccountKind[]).includes(account.kind)) {
        throw new Response("This page isn't open to your Account.", { status: 403 });
      }
      return account as AccountOf<K>;
    },

    /** Signs the Account in: a redirect to its landing page that sets the session cookie. */
    async startSession(account: Account): Promise<Response> {
      const session = await storage.getSession();
      session.set("accountId", account.id);
      return redirect(landingPath(account), {
        headers: { "Set-Cookie": await storage.commitSession(session) },
      });
    },

    /** Signs out: a redirect to the home page that clears the session cookie. */
    async endSession(request: Request): Promise<Response> {
      const session = await storage.getSession(request.headers.get("Cookie"));
      return redirect("/", {
        headers: { "Set-Cookie": await storage.destroySession(session) },
      });
    },
  };
}

export type AccountSessions = ReturnType<typeof createAccountSessions>;
