// One ticket in a spec's queue, as `gh issue list --json
// number,state,labels,body` gives it.
export type QueuedTicket = {
  number: number;
  state: "OPEN" | "CLOSED";
  labels: { name: string }[];
  body: string;
};

// What the spec queue does next (agent-implement-spec.yml):
//
//   decompose   the spec has no queue yet: decompose it.
//   implement   build `ticket`, the frontier ticket.
//   busy        a run already holds the spec or one of its tickets. Start
//               nothing; that run's chain asks again when it ends.
//   drained     nothing to build now, and `reason` says why.
//
// `notices` are for the Owner: tickets parked, or waiting on a merge.
export type Survey =
  | { mode: "decompose"; notices: string[] }
  | { mode: "implement"; ticket: number; notices: string[] }
  | { mode: "busy" | "drained"; reason: string; notices: string[] };

type Parsed = {
  number: number;
  open: boolean;
  labels: string[];
  position: number;
  dependsOn: number[];
};

// The two machine-read lines decompose writes into every ticket's body. A
// ticket without a `Position:` goes last.
const parse = ({ number, state, labels, body }: QueuedTicket): Parsed => ({
  number,
  open: state === "OPEN",
  labels: labels.map((l) => l.name),
  position: Number(/Position:\s*(\d+)/.exec(body)?.[1] ?? 999),
  dependsOn: (/Depends on:\s*([\d, ]*)/.exec(body)?.[1] ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter((d) => d !== "")
    .map(Number),
});

const has = (t: Parsed, label: string) => t.labels.includes(label);

// Reads a spec's queue, and decides what the spec queue does next.
//
// The frontier is the lowest open position whose `Depends on:` positions are
// all closed. Closed means merged: a built ticket stays open, `agent:built`,
// until its pull request's `Closes` closes it, and every branch starts from
// the default branch, so a ticket built any sooner would be built without
// what it depends on.
//
// Out of the frontier: `agent:blocked` (parked for a person, so a broken
// ticket isn't retried forever) and `agent:built` (its pull request is open).
//
// The build runs in the Enrolled repo, while the Home repo's cron keeps
// surveying. So a ticket being built, `agent:in-progress` and not yet
// built, holds the whole queue: the survey claims a ticket before it
// dispatches the build, and never picks a claimed one, so nothing is built
// twice, and the queue still builds one ticket at a time. A built ticket
// under review carries `agent:in-progress` too, and holds nothing.
export const survey = (spec: { labels: string[] }, queue: QueuedTicket[]): Survey => {
  if (spec.labels.includes("agent:blocked")) {
    return {
      mode: "drained",
      reason:
        "The spec is parked (`agent:blocked`). Take the label off to put it back in the queue.",
      notices: [],
    };
  }
  if (queue.length === 0) {
    return spec.labels.includes("agent:in-progress")
      ? { mode: "busy", reason: "The spec is being decomposed.", notices: [] }
      : { mode: "decompose", notices: [] };
  }

  const tickets = queue.map(parse).toSorted((a, b) => a.position - b.position);
  const open = tickets.filter((t) => t.open);
  const parked = open.filter((t) => has(t, "agent:blocked")).length;
  const built = open.filter((t) => has(t, "agent:built")).length;
  const notices = [
    ...(parked > 0
      ? [
          `${parked} ticket(s) parked for a person. Take \`agent:blocked\` off one to put it back in the queue.`,
        ]
      : []),
    ...(built > 0
      ? [`${built} ticket(s) built and waiting for their pull requests to merge.`]
      : []),
  ];

  const building = open.find((t) => has(t, "agent:in-progress") && !has(t, "agent:built"));
  if (building) {
    return { mode: "busy", reason: `Ticket #${building.number} is being built.`, notices };
  }

  const closed = new Set(tickets.filter((t) => !t.open).map((t) => t.position));
  const waiting = open.filter((t) => !has(t, "agent:blocked") && !has(t, "agent:built"));
  const frontier = waiting.find((t) => t.dependsOn.every((d) => closed.has(d)));
  if (frontier) return { mode: "implement", ticket: frontier.number, notices };

  const reason =
    waiting.length === 0
      ? "The queue is drained."
      : built > 0
        ? `${waiting.length} open ticket(s) wait on pull requests to merge.`
        : `${waiting.length} open ticket(s), and none can be built until a parked one is.`;
  return { mode: "drained", reason, notices };
};
