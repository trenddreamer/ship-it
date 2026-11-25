import { describe, expect, it } from "vitest";
import { subscribeSchema } from "../index";

describe("subscribeSchema", () => {
  it("reads the Product id from the URL and the picked Delivery Schedule from the form", () => {
    expect(subscribeSchema.parse({ productId: "12", deliverySchedule: "every-two-weeks" })).toEqual(
      { productId: 12, deliverySchedule: "every-two-weeks" },
    );
  });

  it("asks for a Delivery Schedule when none, or an unknown one, is picked", () => {
    for (const deliverySchedule of [undefined, "", "daily"]) {
      const result = subscribeSchema.safeParse({ productId: "12", deliverySchedule });
      expect(result.error?.issues.map((issue) => [issue.path[0], issue.message])).toEqual([
        ["deliverySchedule", "Pick a Delivery Schedule."],
      ]);
    }
  });

  it("refuses a Product id that isn't a positive whole number", () => {
    for (const productId of ["abc", "0", "-3", "1.5", ""]) {
      const result = subscribeSchema.safeParse({ productId, deliverySchedule: "weekly" });
      expect(result.success).toBe(false);
    }
  });
});
