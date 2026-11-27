import { describe, expect, it } from "vitest";
import { batches } from "./batch.ts";

const HOME = "trenddreamer/ship-it";

describe("batches", () => {
  it("puts the Tickets routed to one Enrolled repo in one batch, in number order", () => {
    expect(
      batches(
        [
          { number: 14, repo: "trenddreamer/family-calendar" },
          { number: 3, repo: "trenddreamer/family-calendar" },
        ],
        HOME,
      ),
    ).toEqual([
      {
        repo: "trenddreamer/family-calendar",
        tickets: [3, 14],
        owner: "trenddreamer",
        repositories: "ship-it,family-calendar",
      },
    ]);
  });

  it("gives each Enrolled repo a batch of its own, with none of another repo's Tickets", () => {
    expect(
      batches(
        [
          { number: 7, repo: "trenddreamer/family-calendar" },
          { number: 5, repo: "trenddreamer/midlands-whats-on" },
          { number: 6, repo: "trenddreamer/family-calendar" },
        ],
        HOME,
      ).map(({ repo, tickets }) => ({ repo, tickets })),
    ).toEqual([
      { repo: "trenddreamer/family-calendar", tickets: [6, 7] },
      { repo: "trenddreamer/midlands-whats-on", tickets: [5] },
    ]);
  });

  it("leaves the refused Tickets out of every batch", () => {
    expect(
      batches(
        [
          { number: 2, refusal: "It has no `repo:` label." },
          { number: 4, repo: "trenddreamer/family-calendar" },
        ],
        HOME,
      ).map(({ tickets }) => tickets),
    ).toEqual([[4]]);
  });

  it("gives no batches when every Ticket was refused", () => {
    expect(batches([{ number: 2, refusal: "It has no `repo:` label." }], HOME)).toEqual([]);
  });

  // While the Marketplace is still in ship-it, the Home repo is its Enrolled
  // repo too, and the token's repo list names it once.
  it("names the Home repo once when it is the Enrolled repo", () => {
    expect(batches([{ number: 9, repo: HOME }], HOME)).toEqual([
      { repo: HOME, tickets: [9], owner: "trenddreamer", repositories: "ship-it" },
    ]);
  });

  // One App token covers repos of one owner only, so a repo under another
  // owner can't share a token with the Home repo.
  it("refuses an Enrolled repo whose owner isn't the Home repo's", () => {
    expect(() => batches([{ number: 9, repo: "someone-else/family-calendar" }], HOME)).toThrow(
      "someone-else/family-calendar isn't owned by trenddreamer, the Home repo's owner, " +
        "so one Factory App token can't cover both.",
    );
  });
});
