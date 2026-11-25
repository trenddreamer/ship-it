import { describe, expect, it } from "vitest";
import { feedbackFormSchema } from "../server";

describe("the Feedback form", () => {
  it("takes the text as typed and the page's path", () => {
    const parsed = feedbackFormSchema.safeParse({ text: "  Too short ", page: "/subscriptions" });
    expect(parsed).toEqual({
      success: true,
      data: { text: "  Too short ", page: "/subscriptions" },
    });
  });

  it.each([
    ["no text", { page: "/subscriptions" }],
    ["no page", { text: "The Subscriptions page is slow." }],
    [
      "a page that isn't a path",
      { text: "The Subscriptions page is slow.", page: "subscriptions" },
    ],
    ["a page that's a URL", { text: "Slow.", page: "https://example.test/subscriptions" }],
  ])("refuses a form with %s", (_, form) => {
    expect(feedbackFormSchema.safeParse(form).success).toBe(false);
  });
});
