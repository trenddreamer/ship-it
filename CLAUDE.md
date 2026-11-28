# ship-it

The Home repo of the Factory: the agents that work on every Enrolled repo, the Registry (`repos.yml`) that routes each Ticket to one, and every Ticket. The terms are in `GLOSSARY.md`, and the reasons in `docs/adr/`. The Marketplace is an Enrolled repo, `trenddreamer/ship-it-marketplace`; its code lives there.

Follow [CODING_STANDARDS.md](./CODING_STANDARDS.md). Run `npm run check` before committing. CI runs it on every pull request.

## Changing the Factory

- The shared workflows (`.github/workflows/factory-*.yml`), their actions (`.github/actions/`) and the agent scripts (`.sandcastle/agent-workflows/`) run from this repo's `main` in every Enrolled repo. A change reaches them all when it merges. Only a live run tests a workflow, and a bad one is undone by reverting it here.
- Each workflow's header says which tokens its jobs hold, and why. A job that runs an agent holds a write token only for what that job must write.
- After changing a rule in `.sandcastle/agent-workflows/`, run `npm run test:mutation`. Target: 85–90%. See `docs/agents/mutation-testing.md`.

## The Team

Four Grok Bots run the Factory for the Owner, acting through the Owner's GitHub account. Their charters are in `docs/team/`: a change there changes how the Team works. Their issues and comments end with `— <Role> (Team)`.

## Enrolled repos

Enrolling a repo, rotating the Factory's secrets, or an Enrolled repo's caller workflow or CI: follow [docs/enrolment/README.md](./docs/enrolment/README.md), which holds the steps, the lean-CI rules and `scripts/set-factory-secrets.sh`.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for trenddreamer/ship-it (via `gh`). Each Ticket carries one `repo:` label for the Enrolled repo it is for. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
