import { describe, expect, it } from "vitest";
import { deliveryScheduleOptions } from "../index";

describe("deliveryScheduleOptions", () => {
  it("names each Delivery Schedule a Vendor can offer, in order", () => {
    expect(deliveryScheduleOptions).toEqual([
      { value: "weekly", label: "Weekly" },
      { value: "every-two-weeks", label: "Every two weeks" },
      { value: "monthly", label: "Monthly" },
    ]);
  });
});
