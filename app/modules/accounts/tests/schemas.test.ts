import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { customerSignUpSchema, signInSchema, vendorSignUpSchema } from "../index";

/** Each problem with a form as `field: message`, or the parsed values when there is none. */
function check(schema: z.ZodType, form: Record<string, string>) {
  const result = schema.safeParse(form);
  return result.success
    ? result.data
    : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
}

const customer = { email: "thandi@example.com", password: "12345678" };
const vendor = { ...customer, businessName: "Karoo Farm", description: "Eggs." };

describe("the sign-up and sign-in forms", () => {
  it("trims and lower-cases the email, so the same address can't sign up twice", () => {
    expect(check(customerSignUpSchema, { ...customer, email: "  Thandi@Example.COM " })).toEqual(
      customer,
    );
    expect(check(signInSchema, { ...customer, email: " THANDI@example.com" })).toEqual(customer);
  });

  it("refuses an email that isn't one", () => {
    expect(check(customerSignUpSchema, { ...customer, email: "thandi" })).toEqual([
      "email: Enter a valid email address.",
    ]);
  });

  it("asks for a new password of 8 to 200 characters", () => {
    expect(check(customerSignUpSchema, { ...customer, password: "1234567" })).toEqual([
      "password: Use at least 8 characters.",
    ]);
    expect(check(customerSignUpSchema, { ...customer, password: "x".repeat(200) })).toEqual({
      ...customer,
      password: "x".repeat(200),
    });
    expect(check(vendorSignUpSchema, { ...vendor, password: "x".repeat(201) })).toEqual([
      "password: Use at most 200 characters.",
    ]);
  });

  it("checks any non-empty password at sign-in", () => {
    expect(check(signInSchema, { ...customer, password: "1" })).toEqual({
      ...customer,
      password: "1",
    });
    expect(check(signInSchema, { ...customer, password: "" })).toEqual([
      "password: Enter your password.",
    ]);
  });

  it("asks a Vendor for a business name and description, trimmed", () => {
    expect(
      check(vendorSignUpSchema, {
        ...vendor,
        businessName: " Karoo Farm ",
        description: " Eggs. ",
      }),
    ).toEqual(vendor);
    expect(check(vendorSignUpSchema, { ...vendor, businessName: "  ", description: "" })).toEqual([
      "businessName: Enter your business name.",
      "description: Describe your business.",
    ]);
  });

  it("keeps a business name to 120 characters and a description to 2,000", () => {
    const longest = { ...vendor, businessName: "n".repeat(120), description: "d".repeat(2000) };
    expect(check(vendorSignUpSchema, longest)).toEqual(longest);
    expect(
      check(vendorSignUpSchema, {
        ...vendor,
        businessName: "n".repeat(121),
        description: "d".repeat(2001),
      }),
    ).toEqual([
      "businessName: Keep your business name to 120 characters.",
      "description: Keep your description to 2,000 characters.",
    ]);
  });
});
