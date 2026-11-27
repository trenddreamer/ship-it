import { describe, expect, it } from "vitest";
import { type QueuedTicket, survey } from "./survey.ts";

const ticket = (
  number: number,
  position: number,
  dependsOn: number[],
  { state = "OPEN", labels = [] }: { state?: "OPEN" | "CLOSED"; labels?: string[] } = {},
): QueuedTicket => ({
  number,
  state,
  labels: ["spec:41", "repo:marketplace", ...labels].map((name) => ({ name })),
  body: `Part of #41\n\nPosition: ${position}\nDepends on: ${dependsOn.join(", ")}\nShape: ui-only\n\n---\n\nBody.`,
});

const spec = { labels: ["agent:implement-spec", "repo:marketplace"] };

describe("survey", () => {
  it("decomposes a spec that has no queue yet", () => {
    expect(survey(spec, [])).toEqual({ mode: "decompose", notices: [] });
  });

  it("builds the lowest open position whose dependencies are all closed", () => {
    const queue = [
      ticket(103, 3, [1]),
      ticket(101, 1, [], { state: "CLOSED" }),
      ticket(104, 4, [2]),
      ticket(102, 2, [1]),
    ];
    expect(survey(spec, queue)).toEqual({ mode: "implement", ticket: 102, notices: [] });
  });

  it("waits on a ticket whose dependency is still open", () => {
    const queue = [ticket(101, 1, [], { labels: ["agent:built"] }), ticket(102, 2, [1])];
    expect(survey(spec, queue).mode).toBe("drained");
  });

  it("starts nothing while a ticket is being built, so it is never built twice", () => {
    const queue = [ticket(101, 1, [], { labels: ["agent:in-progress"] }), ticket(102, 2, [])];
    expect(survey(spec, queue)).toEqual({
      mode: "busy",
      reason: "Ticket #101 is being built.",
      notices: [],
    });
  });

  it("moves on while a built ticket's pull request is being reviewed", () => {
    const queue = [
      ticket(101, 1, [], { labels: ["agent:built", "agent:in-progress"] }),
      ticket(102, 2, []),
    ];
    expect(survey(spec, queue)).toMatchObject({ mode: "implement", ticket: 102 });
  });

  it("decomposes a spec only once, while its decompose run holds it", () => {
    const decomposing = { labels: [...spec.labels, "agent:in-progress"] };
    expect(survey(decomposing, [])).toEqual({
      mode: "busy",
      reason: "The spec is being decomposed.",
      notices: [],
    });
  });

  it("leaves a parked spec alone, queue or not, until a person takes the label off", () => {
    const parked = { labels: [...spec.labels, "agent:blocked"] };
    const reason =
      "The spec is parked (`agent:blocked`). Take the label off to put it back in the queue.";
    expect(survey(parked, [])).toEqual({ mode: "drained", reason, notices: [] });
    expect(survey(parked, [ticket(101, 1, [])])).toEqual({ mode: "drained", reason, notices: [] });
  });

  it("skips a parked ticket, and says it is parked", () => {
    const queue = [ticket(101, 1, [], { labels: ["agent:blocked"] }), ticket(102, 2, [])];
    expect(survey(spec, queue)).toEqual({
      mode: "implement",
      ticket: 102,
      notices: [
        "1 ticket(s) parked for a person. Take `agent:blocked` off one to put it back in the queue.",
      ],
    });
  });

  it("is drained when every ticket is closed", () => {
    const queue = [
      ticket(101, 1, [], { state: "CLOSED" }),
      ticket(102, 2, [1], { state: "CLOSED" }),
    ];
    expect(survey(spec, queue)).toEqual({
      mode: "drained",
      reason: "The queue is drained.",
      notices: [],
    });
  });

  it("stops until a merge when what is left waits on built pull requests", () => {
    const queue = [ticket(101, 1, [], { labels: ["agent:built"] }), ticket(102, 2, [1])];
    expect(survey(spec, queue)).toEqual({
      mode: "drained",
      reason: "1 open ticket(s) wait on pull requests to merge.",
      notices: ["1 ticket(s) built and waiting for their pull requests to merge."],
    });
  });

  it("stops when every open ticket is parked or waits on one that is", () => {
    const queue = [ticket(101, 1, [], { labels: ["agent:blocked"] }), ticket(102, 2, [1])];
    expect(survey(spec, queue)).toMatchObject({
      mode: "drained",
      reason: "1 open ticket(s), and none can be built until a parked one is.",
    });
  });

  it("reads a ticket's position and dependencies from its body", () => {
    const queue = [
      ticket(110, 10, [], { state: "CLOSED" }),
      ticket(111, 11, [], { state: "CLOSED" }),
      ticket(112, 12, [10, 11]),
      ticket(102, 2, [10, 3]),
    ];
    expect(survey(spec, queue)).toMatchObject({ mode: "implement", ticket: 112 });
  });

  it("ignores a trailing comma in a ticket's dependencies", () => {
    const trailing = {
      ...ticket(102, 2, []),
      body: "Position: 2\nDepends on: 1, \nShape: ui-only",
    };
    expect(survey(spec, [ticket(101, 1, [], { state: "CLOSED" }), trailing])).toMatchObject({
      ticket: 102,
    });
  });

  it("puts a ticket with no position line last", () => {
    const stray = { ...ticket(150, 1, []), body: "Part of #41\n\nNo machine lines." };
    expect(survey(spec, [stray, ticket(102, 998, [])])).toMatchObject({ ticket: 102 });
  });
});
