# Every Ticket lives in the Home repo, routed by a `repo:` label

The Factory works on many Enrolled repos, but every Ticket for every one of them is an issue in the Home repo, carrying a `repo:<name>` label. A run reads that label and looks it up in the Registry (`repos.yml` in the Home repo). It refuses any label the Registry doesn't list, so a mistyped label can't send the Factory into a repo that isn't enrolled. The Factory App's installation is a second gate.

We chose this because a workflow in one repo can't see events in another. With every Ticket in the Home repo, every trigger is a native event there, and the Factory chains its own runs with `workflow_dispatch` instead of waiting for events in the Enrolled repo. Feedback buttons in every app file into the Home repo too.

## Considered Options

- **Tickets in each Enrolled repo, with a forwarding workflow in each one.** That means a token and a workflow to keep in step in every repo, only to pass events on.
- **Tickets in each Enrolled repo, with the Home repo polling them on a clock.** That's slower, and it costs Actions minutes for every poll, including the ones that find nothing.

## Consequences

- A PR the Owner opens by hand in an Enrolled repo isn't seen automatically. Each Enrolled repo has a caller workflow for the Factory (ADR-0003), which could pick such PRs up if that turns out to be needed.
- Try caps, throttles and state live on the Ticket in the Home repo: labels, the Factory's own comments, and `concurrency:` groups. The Factory has no database.
- This repo, `ship-it`, is the Home repo. It already holds every earlier Ticket. The Marketplace moves out to a repo of its own and enrols like any other.
