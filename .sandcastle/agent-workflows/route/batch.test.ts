import { describe, expect, it } from "vitest";
import { batches } from "./batch.ts";

const HOME = "trenddreamer/ship-it";

describe("batches", () => {
  it("puts the Tickets routed to one Enrolled repo in one batch, in number order", () => {
    expect(
      batches([
        { number: 14, repo: "trenddreamer/family-calendar" },
        { number: 3, repo: "trenddreamer/family-calendar" },
      ]),
    ).toEqual([
      {
        repo: "trenddreamer/family-calendar",
        tickets: [3, 14],
        owner: "trenddreamer",
        name: "family-calendar",
      },
    ]);
  });

  it("gives each Enrolled repo a batch of its own, with none of another repo's Tickets", () => {
    expect(
      batches([
        { number: 7, repo: "trenddreamer/family-calendar" },
        { number: 5, repo: "trenddreamer/midlands-whats-on" },
        { number: 6, repo: "trenddreamer/family-calendar" },
      ]).map(({ repo, tickets }) => ({ repo, tickets })),
    ).toEqual([
      { repo: "trenddreamer/family-calendar", tickets: [6, 7] },
      { repo: "trenddreamer/midlands-whats-on", tickets: [5] },
    ]);
  });

  it("leaves the refused Tickets out of every batch", () => {
    expect(
      batches([
        { number: 2, refusal: "It has no `repo:` label." },
        { number: 4, repo: "trenddreamer/family-calendar" },
      ]).map(({ tickets }) => tickets),
    ).toEqual([[4]]);
  });

  it("gives no batches when every Ticket was refused", () => {
    expect(batches([{ number: 2, refusal: "It has no `repo:` label." }])).toEqual([]);
  });

  // The dispatch job's token for the batch covers the Enrolled repo alone:
  // the Home repo's Tickets are claimed with a token of their own.
  it("names the Enrolled repo's owner and name, and not the Home repo, even when they are the same", () => {
    expect(batches([{ number: 9, repo: HOME }])).toEqual([
      { repo: HOME, tickets: [9], owner: "trenddreamer", name: "ship-it" },
    ]);
  });

  // Each token covers one repo, so the Enrolled repo's owner may differ
  // from the Home repo's.
  it("batches an Enrolled repo under another owner", () => {
    expect(batches([{ number: 9, repo: "someone-else/family-calendar" }])).toEqual([
      {
        repo: "someone-else/family-calendar",
        tickets: [9],
        owner: "someone-else",
        name: "family-calendar",
      },
    ]);
  });
});
