import { describe, expect, it } from "vitest";
import { changePriceSchema } from "../index";

describe("changePriceSchema", () => {
  it("turns the Product id from the URL and the Price typed in rand into a PriceChange", () => {
    expect(changePriceSchema.parse({ productId: "7", price: " 72,50 " })).toEqual({
      productId: 7,
      priceCents: 7250,
    });
  });

  it("refuses a Price that isn't one, with a message for the field", () => {
    const parsed = changePriceSchema.safeParse({ productId: "7", price: "-72" });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues).toMatchObject([
      { path: ["price"], message: expect.stringMatching(/^Enter the Price in rand/) },
    ]);
  });

  it("refuses a Product id that isn't one", () => {
    expect(changePriceSchema.safeParse({ productId: "eggs", price: "72" }).success).toBe(false);
    expect(changePriceSchema.safeParse({ productId: "0", price: "72" }).success).toBe(false);
  });
});
