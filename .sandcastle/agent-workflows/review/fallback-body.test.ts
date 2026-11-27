import { describe, expect, it } from "vitest";
import { fallbackBody } from "./fallback-body.ts";

const RUN = "https://github.com/trenddreamer/marketplace/actions/runs/99";
const rejected = {
  home: "trenddreamer/ship-it",
  ticket: 46,
  pr: 12,
  branch: "agent/issue-46-7",
  base: "main",
  defaultBranch: "main",
  runUrl: RUN,
};

describe("fallbackBody", () => {
  it("closes the Ticket in the Home repo when it targets the default branch, as the PR it stands in for does", () => {
    expect(fallbackBody(rejected)).toMatch(/^Closes trenddreamer\/ship-it#46\.$/m);
  });

  it("says why it exists, which pull request it stands in for, and which run made it", () => {
    expect(fallbackBody(rejected)).toBe(
      [
        "The review run on #12 committed fixes on top of `agent/issue-46-7`, but `agent/issue-46-7` moved during the run",
        "and the push was rejected. These are those fixes, so they are not lost. Keep this pull request or #12,",
        "and close the other: whichever is merged closes the Ticket.",
        "",
        "Closes trenddreamer/ship-it#46.",
        "",
        `Built unattended by [this run](${RUN}).`,
        "",
      ].join("\n"),
    );
  });

  describe("when it targets a branch other than the default", () => {
    const stacked = { ...rejected, base: "agent/issue-45-3" };

    it("doesn't promise that merging it closes the Ticket", () => {
      expect(fallbackBody(stacked)).toContain(
        "Keep this pull request or #12,\nand close the other.\n",
      );
    });

    it("uses no closing keyword, which GitHub would ignore there", () => {
      expect(fallbackBody(stacked)).not.toMatch(
        /\b(close[sd]?|fix(e[sd])?|resolve[sd]?):?\s+trenddreamer\/ship-it#46/i,
      );
    });

    it("says merging it won't close the Ticket, and that the pull request into the default branch must keep its Closes", () => {
      expect(fallbackBody(stacked)).toContain(
        "It targets `agent/issue-45-3`, not `main`, so merging it leaves trenddreamer/ship-it#46 open: " +
          "GitHub only closes an issue from a pull request into the default branch. " +
          "Whichever pull request finally reaches `main` must keep its closing line for trenddreamer/ship-it#46.",
      );
    });
  });
});
