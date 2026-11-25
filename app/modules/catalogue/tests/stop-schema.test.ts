import { describe, expect, it } from "vitest";
import { stopSchema } from "../index";

describe("stopSchema", () => {
  it("reads a Product stop from the Product id alone", () => {
    expect(stopSchema.parse({ productId: "12" })).toEqual({
      productId: 12,
      deliverySchedule: null,
    });
    expect(stopSchema.parse({ productId: "12", schedule: "" })).toEqual({
      productId: 12,
      deliverySchedule: null,
    });
  });

  it("reads a Delivery Schedule stop from the Product id and the schedule", () => {
    expect(stopSchema.parse({ productId: "12", schedule: "every-two-weeks" })).toEqual({
      productId: 12,
      deliverySchedule: "every-two-weeks",
    });
  });

  it("refuses an unknown schedule or a Product id that isn't a positive whole number", () => {
    expect(stopSchema.safeParse({ productId: "12", schedule: "daily" }).success).toBe(false);
    for (const productId of ["abc", "0", "-3", "1.5", ""]) {
      expect(stopSchema.safeParse({ productId }).success).toBe(false);
    }
  });
});
