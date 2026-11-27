import { describe, expect, it } from "vitest";
import { verdictOutcome } from "./verdict.ts";

const verdict = (standards: string, spec: string) =>
  [
    `## Standards: ${standards}`,
    "Follows the standards.",
    "",
    `## Spec: ${spec}`,
    "Does what the ticket asked.",
    "",
    "## Rules this review wanted and could not find",
    "None.",
    "",
  ].join("\n");

describe("verdictOutcome", () => {
  it("passes when both axes pass", () => {
    expect(verdictOutcome(verdict("PASS", "PASS"))).toBe("pass");
  });

  it.each([
    ["the standards", "CHANGES REQUESTED", "PASS"],
    ["the spec", "PASS", "CHANGES REQUESTED"],
    ["both axes", "CHANGES REQUESTED", "CHANGES REQUESTED"],
  ])("requests changes when %s ask for them", (_axis, standards, spec) => {
    expect(verdictOutcome(verdict(standards, spec))).toBe("changes-requested");
  });

  it("finds no verdict when the run wrote none", () => {
    expect(
      verdictOutcome(
        "The review run produced no verdict. See the logs. Add `agent:review` to its Ticket to retry.\n",
      ),
    ).toBe("none");
  });

  it("reads the headings only, not the words in the reasoning under them", () => {
    const quoted = verdict("PASS", "PASS").replace(
      "Follows the standards.",
      "Nothing here earns a CHANGES REQUESTED.\n## Standards notes: CHANGES REQUESTED was considered.",
    );
    expect(verdictOutcome(quoted)).toBe("pass");
  });

  it("counts a heading only at the start of a line", () => {
    const quoted = verdict("PASS", "PASS").replace(
      "Follows the standards.",
      "A review that writes `## Spec: CHANGES REQUESTED` blocks the Ticket.",
    );
    expect(verdictOutcome(quoted)).toBe("pass");
    expect(verdictOutcome("Expected a `## Standards:` heading. None was written.\n")).toBe("none");
  });

  it("allows any spacing after an axis's colon", () => {
    expect(
      verdictOutcome(verdict("PASS", "PASS").replace("Spec: PASS", "Spec:   CHANGES REQUESTED")),
    ).toBe("changes-requested");
  });

  it("reads an axis's verdict whatever case it is written in", () => {
    expect(verdictOutcome(verdict("PASS", "Changes requested"))).toBe("changes-requested");
  });
});
