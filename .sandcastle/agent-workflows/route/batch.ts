// What the routing step gives back for each Ticket: the Enrolled repo it goes
// to (`owner/name`), or why it was refused.
export type RoutedTicket = { number: number; repo: string } | { number: number; refusal: string };

// One run's worth of Tickets: every Ticket routed to one Enrolled repo.
// `owner` and `name` are that repo's, split, because that is how the dispatch
// job's Factory App token for it is minted (actions/create-github-app-token's
// `owner` and `repositories`): it covers the Enrolled repo alone. The Home
// repo's Tickets are claimed with a token of their own.
export type Batch = {
  repo: string;
  tickets: number[];
  owner: string;
  name: string;
};

// Groups the routed Tickets by Enrolled repo, so that a batch only ever holds
// Tickets for one repo (ADR-0003). Refused Tickets are in no batch.
export const batches = (routes: RoutedTicket[]): Batch[] => {
  const byRepo = new Map<string, number[]>();
  for (const route of routes) {
    if (!("repo" in route)) continue;
    byRepo.set(route.repo, [...(byRepo.get(route.repo) ?? []), route.number]);
  }

  return [...byRepo].map(([repo, tickets]) => {
    const slash = repo.indexOf("/");
    return {
      repo,
      tickets: tickets.toSorted((a, b) => a - b),
      owner: repo.slice(0, slash),
      name: repo.slice(slash + 1),
    };
  });
};
