import { describe, expect, it } from "vitest";
import { type Registry, route } from "./route.ts";

const REGISTRY: Registry = {
  repos: [
    { label: "repo:marketplace", repo: "trenddreamer/ship-it" },
    { label: "repo:family-calendar", repo: "trenddreamer/family-calendar" },
  ],
};

describe("route", () => {
  it("routes a Ticket with one listed repo: label to its Enrolled repo", () => {
    expect(route(["repo:family-calendar"], REGISTRY)).toEqual({
      repo: "trenddreamer/family-calendar",
    });
  });

  it("ignores the labels that aren't repo: labels", () => {
    expect(
      route(["agent:explore", "bug", "repo:marketplace", "feedback", "spec:41"], REGISTRY),
    ).toEqual({ repo: "trenddreamer/ship-it" });
  });

  it("refuses a Ticket with no repo: label", () => {
    expect(route(["agent:explore", "bug"], REGISTRY)).toEqual({
      refusal:
        "It has no `repo:` label, so the Factory doesn't know which repo it is for. " +
        "Add the label of one repo in the Registry (`repos.yml`).",
    });
  });

  // Even when every one of them is listed: the Factory won't guess.
  it("refuses a Ticket with more than one repo: label, naming them", () => {
    expect(route(["repo:marketplace", "bug", "repo:family-calendar"], REGISTRY)).toEqual({
      refusal:
        "It has more than one `repo:` label (`repo:marketplace`, `repo:family-calendar`), " +
        "so the Factory doesn't know which repo it is for. Keep only the one it is for.",
    });
  });

  // A typo must not send the Factory into a repo that isn't enrolled.
  it("refuses a Ticket whose repo: label the Registry doesn't list, naming it", () => {
    expect(route(["repo:marketplce"], REGISTRY)).toEqual({
      refusal:
        "Its label `repo:marketplce` isn't in the Registry (`repos.yml`), " +
        "so the Factory won't work on it. Fix the label, or enrol the repo first.",
    });
  });
});
