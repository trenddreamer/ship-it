import { describe, expect, it } from "vitest";
import { browserUnsafeDependencies } from "~/modules/browser-safety";
import { deliveryScheduleLabel, deliveryScheduleOptions } from "../client";

describe("client.ts", () => {
  it("serves the Delivery Schedule names components show", () => {
    expect(deliveryScheduleLabel("monthly")).toBe("Monthly");
    expect(deliveryScheduleOptions.map((option) => option.value)).toEqual([
      "weekly",
      "every-two-weeks",
      "monthly",
    ]);
  });

  it("loads no Node built-in, database driver or server-only file, so it is safe in the browser", async () => {
    expect(await browserUnsafeDependencies("app/modules/deliveries/client.ts")).toEqual([]);
  });
});
