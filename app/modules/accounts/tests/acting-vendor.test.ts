import { describe, expect, it } from "vitest";
import { freshDatabase } from "~/db/fresh-database";
import { decideVendor } from "~/modules/vendors";
import { signUpCustomer, signUpVendor } from "../index";
import { createAccountSessions } from "../server";

const secret = "a test secret";
const url = "http://marketplace.test/vendor";

async function thrownBy(promise: Promise<unknown>): Promise<Response> {
  try {
    await promise;
  } catch (thrown) {
    if (thrown instanceof Response) return thrown;
    throw thrown;
  }
  throw new Error("expected a Response to be thrown");
}

/** A signed-in request for a newly signed-up, pending Vendor. */
async function signedInVendor() {
  const database = await freshDatabase();
  const sessions = createAccountSessions(database, { secret });
  const result = await signUpVendor(database, {
    email: "vendor@example.com",
    password: "vendor password",
    businessName: "Karoo Farm",
    description: "Eggs.",
  });
  if (!result.ok || result.account.kind !== "vendor") throw new Error("sign-up failed");
  const started = await sessions.startSession(result.account);
  const cookie = started.headers.get("Set-Cookie")!.split(";")[0]!;
  return {
    database,
    sessions,
    account: result.account,
    request: new Request(url, { headers: { Cookie: cookie } }),
  };
}

describe("requireActingVendor", () => {
  it("admits a pending Vendor, and an approved one", async () => {
    const { database, sessions, account, request } = await signedInVendor();
    expect(await sessions.requireActingVendor(request)).toEqual(account);

    await decideVendor(database, { vendorId: account.vendorId, decision: "approved" });
    expect(await sessions.requireActingVendor(request)).toEqual(account);
  });

  it("refuses a rejected Vendor with a 403 that says why", async () => {
    const { database, sessions, account, request } = await signedInVendor();
    await decideVendor(database, { vendorId: account.vendorId, decision: "rejected" });

    const refusal = await thrownBy(sessions.requireActingVendor(request));
    expect(refusal.status).toBe(403);
    expect(await refusal.text()).toBe(
      "An Admin rejected your business, so it can't sell on the Marketplace.",
    );
  });

  it("sends a visitor to sign in, and refuses other kinds of Account", async () => {
    const { database, sessions } = await signedInVendor();
    const visitor = await thrownBy(sessions.requireActingVendor(new Request(url)));
    expect(visitor.headers.get("Location")).toBe("/sign-in");

    const customer = await signUpCustomer(database, {
      email: "customer@example.com",
      password: "customer pw",
    });
    if (!customer.ok) throw new Error("sign-up failed");
    const started = await sessions.startSession(customer.account);
    const cookie = started.headers.get("Set-Cookie")!.split(";")[0]!;
    const refusal = await thrownBy(
      sessions.requireActingVendor(new Request(url, { headers: { Cookie: cookie } })),
    );
    expect(refusal.status).toBe(403);
  });
});
