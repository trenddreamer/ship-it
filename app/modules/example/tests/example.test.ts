import { describe, expect, it } from "vitest";
import { toSlug } from "../index";

describe("toSlug", () => {
  it("lowercases and hyphenates words", () => {
    expect(toSlug("Ship It Now")).toBe("ship-it-now");
  });

  it("strips accents and punctuation", () => {
    expect(toSlug("  Café, déjà vu!  ")).toBe("cafe-deja-vu");
  });
});
