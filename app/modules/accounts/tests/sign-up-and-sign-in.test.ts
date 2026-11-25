import { describe, expect, it } from "vitest";
import { accounts } from "~/db/schema";
import { signIn, signUpCustomer } from "../index";
import { freshDatabase } from "./database";

describe("signing up as a Customer and signing in", () => {
  it("lets a new Customer sign in with the email and password they signed up with", async () => {
    const database = await freshDatabase();

    const signedUp = await signUpCustomer(database, {
      email: "thandi@example.com",
      password: "correct horse battery",
    });
    const signedIn = await signIn(database, {
      email: "thandi@example.com",
      password: "correct horse battery",
    });

    expect(signedUp).toEqual({
      ok: true,
      account: { id: expect.any(Number), email: "thandi@example.com", kind: "customer" },
    });
    expect(signedIn).toEqual(signedUp);
  });
});

async function withThandi() {
  const database = await freshDatabase();
  await signUpCustomer(database, { email: "thandi@example.com", password: "correct horse" });
  return database;
}

describe("refusals", () => {
  it("gives a wrong password and an unknown email the same refusal", async () => {
    const database = await withThandi();

    const wrongPassword = await signIn(database, {
      email: "thandi@example.com",
      password: "wrong horse",
    });
    const unknownEmail = await signIn(database, {
      email: "nobody@example.com",
      password: "correct horse",
    });

    expect(wrongPassword).toEqual({ ok: false, error: "wrong-credentials" });
    expect(unknownEmail).toEqual(wrongPassword);
  });

  it("refuses to sign up an email that already has an Account", async () => {
    const database = await withThandi();

    const again = await signUpCustomer(database, {
      email: "thandi@example.com",
      password: "another password",
    });

    expect(again).toEqual({ ok: false, error: "email-taken" });
    expect(
      await signIn(database, { email: "thandi@example.com", password: "another password" }),
    ).toEqual({ ok: false, error: "wrong-credentials" });
  });
});

describe("stored passwords", () => {
  it("stores only a salted scrypt hash, never the password", async () => {
    const database = await freshDatabase();
    await signUpCustomer(database, { email: "a@example.com", password: "same password" });
    await signUpCustomer(database, { email: "b@example.com", password: "same password" });

    const stored = await database.select({ hash: accounts.passwordHash }).from(accounts).all();

    expect(stored).toHaveLength(2);
    for (const { hash } of stored) {
      expect(hash).toMatch(/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
      expect(hash).not.toContain("same password");
    }
    expect(stored[0]!.hash).not.toBe(stored[1]!.hash);
  });
});
