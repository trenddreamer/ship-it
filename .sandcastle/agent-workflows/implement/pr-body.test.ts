import { describe, expect, it } from "vitest";
import { prBody } from "./pr-body.ts";

const RUN = "https://github.com/trenddreamer/marketplace/actions/runs/99";
const footing = { home: "trenddreamer/ship-it", ticket: 46, runUrl: RUN };

describe("prBody", () => {
  it("closes the Ticket in the Home repo by its cross-repo reference", () => {
    expect(prBody("Adds a button.\n", footing)).toContain(
      "Closes trenddreamer/ship-it#46. Built unattended by [this run](" + RUN + ").",
    );
  });

  it("puts the agent's summary first, then the Factory's footer under a rule", () => {
    expect(prBody("## What\n\nAdds a button.\n", footing)).toBe(
      [
        "## What",
        "",
        "Adds a button.",
        "",
        "---",
        "",
        `Closes trenddreamer/ship-it#46. Built unattended by [this run](${RUN}).`,
        "The reviewer has been asked to read it. It stays a draft until the verdict is posted.",
        "",
      ].join("\n"),
    );
  });

  it.each(["", "  \n\n"])("says who built it when the agent wrote no summary (%j)", (empty) => {
    expect(prBody(empty, footing)).toMatch(
      /^Built by the Factory's implementer\.\n\n---\n\nCloses trenddreamer\/ship-it#46\./,
    );
  });

  it("names the spec a queued ticket is part of, in the same cross-repo form", () => {
    expect(prBody("Adds a button.\n", { ...footing, spec: 41 })).toContain(
      "Closes trenddreamer/ship-it#46. Part of trenddreamer/ship-it#41. Built unattended by [this run](" +
        RUN +
        ").",
    );
  });

  it("names no spec for a Ticket built on its own", () => {
    expect(prBody("Adds a button.\n", footing)).not.toContain("Part of");
  });
});
