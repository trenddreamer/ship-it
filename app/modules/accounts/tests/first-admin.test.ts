import { describe, expect, it } from "vitest";
import { customerSignUpSchema, ensureFirstAdmin, signIn, signUpCustomer } from "../index";
import { freshDatabase } from "~/db/fresh-database";

const admin = { email: "admin@ship-it.example", password: "run the market" };

describe("the first Admin", () => {
  it("is created from configuration when no Admin exists, and can sign in", async () => {
    const database = await freshDatabase();

    expect(await ensureFirstAdmin(database, admin)).toBe("created");

    expect(await signIn(database, admin)).toEqual({
      ok: true,
      account: { id: expect.any(Number), email: "admin@ship-it.example", kind: "admin" },
    });
  });

  it("is not created again once an Admin exists, whatever the configuration says", async () => {
    const database = await freshDatabase();
    await ensureFirstAdmin(database, admin);
    const other = { email: "other-admin@ship-it.example", password: "another admin" };

    expect(await ensureFirstAdmin(database, other)).toBe("exists");
    expect(await ensureFirstAdmin(database, admin)).toBe("exists");

    expect(await signIn(database, other)).toEqual({ ok: false, error: "wrong-credentials" });
  });

  it("refuses to make an Admin of an email another kind of Account already has", async () => {
    const database = await freshDatabase();
    await signUpCustomer(database, { email: admin.email, password: "just a customer" });

    await expect(ensureFirstAdmin(database, admin)).rejects.toThrow(
      "admin@ship-it.example already has an Account",
    );
  });
});

describe("nobody signs up as an Admin", () => {
  it("makes a Customer of a sign-up that asks to be an Admin", async () => {
    const database = await freshDatabase();
    const form = { email: "sneaky@example.com", password: "let me in", kind: "admin" };

    const result = await signUpCustomer(database, customerSignUpSchema.parse(form));

    expect(result).toEqual({ ok: true, account: expect.objectContaining({ kind: "customer" }) });
  });
});
