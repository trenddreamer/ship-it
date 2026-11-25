import { describe, expect, it } from "vitest";
import type { MarketplaceDatabase } from "~/modules/vendors";
import { ensureFirstAdmin, signIn, signUpCustomer, signUpVendor, type Account } from "../index";
import { createAccountSessions, landingPath } from "../server";
import { freshDatabase } from "./database";

const secret = "a test secret";
const url = "http://marketplace.test/somewhere";

/** A request carrying the cookie a response set, as a browser would send it next. */
function requestWithCookieFrom(response: Response): Request {
  const setCookie = response.headers.get("Set-Cookie") ?? "";
  return new Request(url, { headers: { Cookie: setCookie.split(";")[0]! } });
}

async function thrownBy(promise: Promise<unknown>): Promise<Response> {
  try {
    await promise;
  } catch (thrown) {
    if (thrown instanceof Response) return thrown;
    throw thrown;
  }
  throw new Error("expected a Response to be thrown");
}

async function oneOfEachKind(database: MarketplaceDatabase) {
  await ensureFirstAdmin(database, { email: "admin@example.com", password: "admin password" });
  await signUpCustomer(database, { email: "customer@example.com", password: "customer pw" });
  await signUpVendor(database, {
    email: "vendor@example.com",
    password: "vendor password",
    businessName: "Karoo Farm",
    description: "Eggs.",
  });
  const account = async (email: string, password: string): Promise<Account> => {
    const result = await signIn(database, { email, password });
    if (!result.ok) throw new Error(`can't sign in as ${email}`);
    return result.account;
  };
  return {
    admin: await account("admin@example.com", "admin password"),
    customer: await account("customer@example.com", "customer pw"),
    vendor: await account("vendor@example.com", "vendor password"),
  };
}

describe("landingPath", () => {
  it("sends each kind of Account to its own page", async () => {
    const { admin, customer, vendor } = await oneOfEachKind(await freshDatabase());

    expect(landingPath(customer)).toBe("/");
    expect(landingPath(vendor)).toBe("/vendor");
    expect(landingPath(admin)).toBe("/admin");
  });
});

describe("account sessions", () => {
  it("knows no Account for a visitor, and sends them to sign in", async () => {
    const sessions = createAccountSessions(await freshDatabase(), { secret });
    const visitor = new Request(url);

    expect(await sessions.currentAccount(visitor)).toBeNull();
    const refusal = await thrownBy(sessions.requireAccount(visitor, "customer"));
    expect(refusal.status).toBe(302);
    expect(refusal.headers.get("Location")).toBe("/sign-in");
  });

  it("starts a session that lands the Account on its page and remembers it", async () => {
    const database = await freshDatabase();
    const { vendor } = await oneOfEachKind(database);
    const sessions = createAccountSessions(database, { secret });

    const started = await sessions.startSession(vendor);
    const next = requestWithCookieFrom(started);

    expect(started.status).toBe(302);
    expect(started.headers.get("Location")).toBe("/vendor");
    expect(started.headers.get("Set-Cookie")).toMatch(/HttpOnly/i);
    expect(await sessions.currentAccount(next)).toEqual(vendor);
    expect(await sessions.requireAccount(next, "vendor")).toEqual(vendor);
  });

  it("refuses each kind of Account the other kinds' pages", async () => {
    const database = await freshDatabase();
    const accounts = await oneOfEachKind(database);
    const sessions = createAccountSessions(database, { secret });

    const outcomes: string[] = [];
    for (const account of Object.values(accounts)) {
      const request = requestWithCookieFrom(await sessions.startSession(account));
      for (const kind of ["customer", "vendor", "admin"] as const) {
        const outcome = await sessions.requireAccount(request, kind).then(
          (admitted) => `admits ${admitted.email}`,
          (refusal: Response) => `refuses with ${refusal.status}`,
        );
        outcomes.push(`${account.kind} on a ${kind} page: ${outcome}`);
      }
    }

    expect(outcomes).toEqual([
      "admin on a customer page: refuses with 403",
      "admin on a vendor page: refuses with 403",
      "admin on a admin page: admits admin@example.com",
      "customer on a customer page: admits customer@example.com",
      "customer on a vendor page: refuses with 403",
      "customer on a admin page: refuses with 403",
      "vendor on a customer page: refuses with 403",
      "vendor on a vendor page: admits vendor@example.com",
      "vendor on a admin page: refuses with 403",
    ]);
  });

  it("lets a page open to several kinds admit each of them", async () => {
    const database = await freshDatabase();
    const { admin, customer, vendor } = await oneOfEachKind(database);
    const sessions = createAccountSessions(database, { secret });
    const as = async (account: Account) =>
      requestWithCookieFrom(await sessions.startSession(account));

    expect(await sessions.requireAccount(await as(admin), "admin", "vendor")).toEqual(admin);
    expect(await sessions.requireAccount(await as(vendor), "admin", "vendor")).toEqual(vendor);
    const refusal = await thrownBy(sessions.requireAccount(await as(customer), "admin", "vendor"));
    expect(refusal.status).toBe(403);
  });

  it("ends the session on sign-out, back to the home page", async () => {
    const database = await freshDatabase();
    const { customer } = await oneOfEachKind(database);
    const sessions = createAccountSessions(database, { secret });
    const signedIn = requestWithCookieFrom(await sessions.startSession(customer));

    const ended = await sessions.endSession(signedIn);

    expect(ended.status).toBe(302);
    expect(ended.headers.get("Location")).toBe("/");
    expect(await sessions.currentAccount(requestWithCookieFrom(ended))).toBeNull();
  });

  it("trusts no session cookie signed with another secret", async () => {
    const database = await freshDatabase();
    const { admin } = await oneOfEachKind(database);
    const forger = createAccountSessions(database, { secret: "the wrong secret" });
    const sessions = createAccountSessions(database, { secret });

    const forged = requestWithCookieFrom(await forger.startSession(admin));

    expect(await sessions.currentAccount(forged)).toBeNull();
  });
});
