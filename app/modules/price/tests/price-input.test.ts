import { describe, expect, it } from "vitest";
import { priceInputSchema } from "../index";

describe("priceInputSchema", () => {
  it.each([
    ["150", 15000],
    ["150.5", 15050],
    ["150,50", 15050],
    ["0.05", 5],
    ["0", 0],
    [" 1500.00 ", 150000],
  ])("reads %j rand as %i cents", (typed, cents) => {
    expect(priceInputSchema.parse(typed)).toBe(cents);
  });

  it.each(["", "  ", "-5", "12.345", "1e3", "R 150", "abc", "1.2.3", ".5", "1."])(
    "refuses %j with a message",
    (typed) => {
      const result = priceInputSchema.safeParse(typed);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(
        "Enter the Price in rand, to the cent at most, e.g. 150 or 150,50.",
      );
    },
  );

  it("refuses a Price too large to be whole cents", () => {
    const result = priceInputSchema.safeParse("999999999999999999");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("That Price is too large.");
  });
});
