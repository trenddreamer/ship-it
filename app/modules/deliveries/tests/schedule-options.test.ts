import { describe, expect, it } from "vitest";
import { deliveryScheduleLabel, deliveryScheduleOptions } from "../index";

describe("deliveryScheduleOptions", () => {
  it("names each Delivery Schedule a Vendor can offer, in order", () => {
    expect(deliveryScheduleOptions).toEqual([
      { value: "weekly", label: "Weekly" },
      { value: "every-two-weeks", label: "Every two weeks" },
      { value: "monthly", label: "Monthly" },
    ]);
  });
});

describe("deliveryScheduleLabel", () => {
  it("names one Delivery Schedule as people see it", () => {
    expect(deliveryScheduleLabel("weekly")).toBe("Weekly");
    expect(deliveryScheduleLabel("every-two-weeks")).toBe("Every two weeks");
    expect(deliveryScheduleLabel("monthly")).toBe("Monthly");
  });
});
