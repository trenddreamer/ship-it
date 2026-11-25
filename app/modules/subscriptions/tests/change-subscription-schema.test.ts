import { describe, expect, it } from "vitest";
import { changeSubscriptionSchema } from "../index";

describe("changeSubscriptionSchema", () => {
  it("reads a switch: the Subscription and the Delivery Schedule picked", () => {
    expect(
      changeSubscriptionSchema.parse({
        intent: "switch",
        subscriptionId: "7",
        deliverySchedule: "monthly",
      }),
    ).toEqual({ intent: "switch", subscriptionId: 7, deliverySchedule: "monthly" });
  });

  it("reads a cancel: the Subscription only", () => {
    expect(changeSubscriptionSchema.parse({ intent: "cancel", subscriptionId: "7" })).toEqual({
      intent: "cancel",
      subscriptionId: 7,
    });
  });

  it("asks for a Delivery Schedule when a switch picks none, or an unknown one", () => {
    for (const deliverySchedule of [undefined, "", "daily"]) {
      const result = changeSubscriptionSchema.safeParse({
        intent: "switch",
        subscriptionId: "7",
        deliverySchedule,
      });
      expect(result.error?.issues.map((issue) => [issue.path[0], issue.message])).toEqual([
        ["deliverySchedule", "Pick a Delivery Schedule."],
      ]);
    }
  });

  it("refuses an unknown intent or a Subscription id that isn't a positive whole number", () => {
    for (const input of [
      { intent: "pause", subscriptionId: "7" },
      { intent: "cancel", subscriptionId: "0" },
      { intent: "cancel", subscriptionId: "1.5" },
      { intent: "cancel", subscriptionId: "abc" },
    ]) {
      expect(changeSubscriptionSchema.safeParse(input).success).toBe(false);
    }
  });
});
