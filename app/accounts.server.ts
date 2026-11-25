// The app's Account sessions. Every loader and action starts with one of:
//
// - `await requireAccount(request, "vendor")`: the signed-in Vendor Account
//   (typed as one), or it throws: a redirect to /sign-in for a visitor, a 403
//   for another kind of Account. Pass several kinds to admit any of them.
// - `await requireActingVendor(request)`: the same for a Vendor Account, and
//   a 403 when an Admin rejected the Vendor. Every Vendor page and action
//   uses it, except the Vendor page's loader (which shows a rejected Vendor
//   that it was rejected) and the Inbox.
// - `await currentAccount(request)`: the signed-in Account or null, for
//   pages open to visitors.
//
// `startSession(account)` and `endSession(request)` sign in and out.
//
// Loading this file also creates the first Admin from configuration when no
// Admin exists, so it happens as the app starts.
import { db } from "~/db/client.server";
import { ensureFirstAdmin } from "~/modules/accounts";
import { createAccountSessions } from "~/modules/accounts/server";
import { config } from "./config.server";

export const { currentAccount, requireAccount, requireActingVendor, startSession, endSession } =
  createAccountSessions(db, { secret: config.sessionSecret, secure: config.sessionCookieSecure });

await ensureFirstAdmin(db, config.firstAdmin);
