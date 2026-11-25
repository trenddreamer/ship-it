import { describe, expect, it } from "vitest";
import { formatPrice, priceSchema } from "../index";

// en-ZA separates with non-breaking spaces (U+00A0), so the expected
// strings spell them out.
const nbsp = " ";

describe("formatPrice", () => {
  it.each([
    [15000, `R${nbsp}150,00`],
    [150000, `R${nbsp}1${nbsp}500,00`],
    [4999, `R${nbsp}49,99`],
    [5, `R${nbsp}0,05`],
    [0, `R${nbsp}0,00`],
  ])("formats %i cents as %s", (cents, shown) => {
    expect(formatPrice(cents)).toBe(shown);
  });

  it.each([-1, 1.5, Number.NaN])("rejects %s, which isn't a Price", (cents) => {
    expect(() => formatPrice(cents)).toThrow();
  });
});

describe("priceSchema", () => {
  it("accepts whole, non-negative cents", () => {
    expect(priceSchema.safeParse(15000).success).toBe(true);
  });

  it.each([-100, 99.5, "15000"])("rejects %s", (value) => {
    expect(priceSchema.safeParse(value).success).toBe(false);
  });
});
