import { describe, expect, it } from "vitest";
import { searchQuerySchema } from "../index";

describe("searchQuerySchema", () => {
  it("reads the query from the URL's q parameter, trimmed", () => {
    const params = new URLSearchParams("q=%20free-range%20eggs%20");
    expect(searchQuerySchema.parse(Object.fromEntries(params))).toEqual({ q: "free-range eggs" });
  });

  it("treats a missing query as the empty search", () => {
    expect(searchQuerySchema.parse({})).toEqual({ q: "" });
  });

  it("takes a query of up to 200 characters", () => {
    expect(searchQuerySchema.safeParse({ q: "a".repeat(200) }).success).toBe(true);
  });

  it("rejects a longer query, with a message for the visitor", () => {
    const result = searchQuerySchema.safeParse({ q: "a".repeat(201) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Keep your search under 200 characters.");
  });
});
