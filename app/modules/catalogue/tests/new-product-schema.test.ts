import { describe, expect, it } from "vitest";
import { z } from "zod";
import { newProductSchema } from "../index";

const form = {
  name: " Free-range eggs (30) ",
  description: " A tray of 30 large eggs. ",
  price: "150,50",
  deliverySchedules: ["monthly", "weekly"],
};

function errorsFor(input: unknown) {
  const result = newProductSchema.safeParse(input);
  expect(result.success).toBe(false);
  return result.error ? z.flattenError(result.error).fieldErrors : {};
}

describe("newProductSchema", () => {
  it("reads the form into a Product to add, with the Price in whole cents", () => {
    expect(newProductSchema.parse(form)).toEqual({
      name: "Free-range eggs (30)",
      description: "A tray of 30 large eggs.",
      priceCents: 15050,
      deliverySchedules: ["monthly", "weekly"],
    });
  });

  it("refuses a Product with no Delivery Schedule", () => {
    expect(errorsFor({ ...form, deliverySchedules: [] })).toEqual({
      deliverySchedules: ["Pick at least one Delivery Schedule."],
    });
  });

  it("refuses a Delivery Schedule that isn't offered", () => {
    expect(errorsFor({ ...form, deliverySchedules: ["daily"] })).toEqual({
      deliverySchedules: ["Pick from weekly, every two weeks or monthly."],
    });
  });

  it.each(["-5", "12.345", "abc", ""])("refuses the Price %j", (price) => {
    expect(errorsFor({ ...form, price })).toEqual({
      price: ["Enter the Price in rand, to the cent at most, e.g. 150 or 150,50."],
    });
  });

  it("refuses a missing name and description", () => {
    expect(errorsFor({ ...form, name: "  ", description: "" })).toEqual({
      name: ["Enter the Product's name."],
      description: ["Describe the Product."],
    });
  });

  it("refuses a name over 120 characters and a description over 2,000", () => {
    expect(errorsFor({ ...form, name: "n".repeat(121), description: "d".repeat(2001) })).toEqual({
      name: ["Keep the name to 120 characters."],
      description: ["Keep the description to 2,000 characters."],
    });
    expect(
      newProductSchema.safeParse({ ...form, name: "n".repeat(120), description: "d".repeat(2000) })
        .success,
    ).toBe(true);
  });
});
