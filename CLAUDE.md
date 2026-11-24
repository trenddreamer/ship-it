# ship-it

Modules are deep modules: see [app/modules/README.md](./app/modules/README.md) before adding or importing one, and follow [CODING_STANDARDS.md](./CODING_STANDARDS.md). Run `npm run check` (typecheck, boundaries, tests) before committing.

## Stack and commands

React Router (framework mode) on Node 22, with Drizzle over SQLite and Vitest. Routes are in `app/routes.ts` and `app/routes/`, and the schema is in `app/db/schema.ts`.

- `npm run dev`: dev server. `npm run build`: production build, which must pass.
- `npm run check`: typecheck, module boundaries and tests. CI runs it on every pull request.
- `npm run db:generate`: write a migration after changing the schema. Commit both together.
- `npm run db:migrate`, then `npm run db:seed`: set up the database in `data/` (override with `DATABASE_PATH`).

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for trenddreamer/ship-it (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
