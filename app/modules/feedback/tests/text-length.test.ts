import { describe, expect, it } from "vitest";
import { feedbackTextLength } from "../index";

describe("Feedback's text length", () => {
  it("is 10 to 2,000 characters, the same limits giveFeedback holds it to", () => {
    expect(feedbackTextLength).toEqual({ min: 10, max: 2000 });
  });
});
