import { describe, expect, it } from "vitest";
import { vendorDecisionSchema } from "../index";

describe("vendorDecisionSchema", () => {
  it.each(["approved", "rejected"] as const)("reads a decision to mark a Vendor %s", (decision) => {
    expect(vendorDecisionSchema.parse({ vendorId: "7", decision })).toEqual({
      vendorId: 7,
      decision,
    });
  });

  it.each([
    ["no Vendor", { decision: "approved" }],
    ["a Vendor id that isn't a whole number", { vendorId: "7.5", decision: "approved" }],
    ["a Vendor id that isn't a number", { vendorId: "seven", decision: "approved" }],
    ["a Vendor id below 1", { vendorId: "0", decision: "approved" }],
    ["no decision", { vendorId: "7" }],
    ["pending as a decision", { vendorId: "7", decision: "pending" }],
  ])("refuses %s", (_, input) => {
    expect(vendorDecisionSchema.safeParse(input).success).toBe(false);
  });
});
