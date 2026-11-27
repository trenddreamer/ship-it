// What the routing step gives back for each Ticket: the Enrolled repo it goes
// to (`owner/name`), or why it was refused.
export type RoutedTicket = { number: number; repo: string } | { number: number; refusal: string };

// One explore run's worth of Tickets: every Ticket routed to one Enrolled
// repo. `owner` and `repositories` are what the Factory App's token for that
// run is minted with (actions/create-github-app-token): the Home repo and the
// Enrolled repo, and nothing else.
export type Batch = {
  repo: string;
  tickets: number[];
  owner: string;
  repositories: string;
};

const ownerAndName = (repo: string): [string, string] => {
  const [owner = "", name = ""] = repo.split("/");
  return [owner, name];
};

// Groups the routed Tickets by Enrolled repo, so that a batch only ever holds
// Tickets for one repo (ADR-0003). Refused Tickets are in no batch.
export const batches = (routes: RoutedTicket[], home: string): Batch[] => {
  const byRepo = new Map<string, number[]>();
  for (const route of routes) {
    if (!("repo" in route)) continue;
    byRepo.set(route.repo, [...(byRepo.get(route.repo) ?? []), route.number]);
  }

  const [homeOwner, homeName] = ownerAndName(home);
  return [...byRepo].map(([repo, tickets]) => {
    const [owner, name] = ownerAndName(repo);
    if (owner !== homeOwner) {
      throw new Error(
        `${repo} isn't owned by ${homeOwner}, the Home repo's owner, ` +
          "so one Factory App token can't cover both.",
      );
    }
    return {
      repo,
      tickets: tickets.toSorted((a, b) => a - b),
      owner,
      repositories: [...new Set([homeName, name])].join(","),
    };
  });
};
