import { describe, expect, it } from "vitest";
import { browserUnsafeDependencies } from "~/modules/browser-safety";
import { deliveryAddressLine } from "../client";

describe("client.ts", () => {
  it("serves the one-line Delivery Address components show", () => {
    const address = {
      street: "1 Long St",
      suburb: "Gardens",
      city: "Cape Town",
      postalCode: "8001",
    };
    expect(deliveryAddressLine(address)).toBe("1 Long St, Gardens, Cape Town, 8001");
  });

  it("loads no Node built-in, database driver or server-only file, so it is safe in the browser", async () => {
    expect(await browserUnsafeDependencies("app/modules/accounts/client.ts")).toEqual([]);
  });
});
