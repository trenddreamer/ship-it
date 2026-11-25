import { describe, expect, it } from "vitest";
import { shipDeliverySchema } from "../index";

describe("the mark-shipped form", () => {
  it("reads the Delivery's id from the form", () => {
    expect(shipDeliverySchema.parse({ deliveryId: "12" })).toEqual({ deliveryId: 12 });
  });

  it.each([
    {},
    { deliveryId: "" },
    { deliveryId: "0" },
    { deliveryId: "1.5" },
    { deliveryId: "x" },
  ])("refuses %j", (form) => {
    expect(shipDeliverySchema.safeParse(form).success).toBe(false);
  });
});
