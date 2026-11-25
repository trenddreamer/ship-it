# ship-it

Modules are deep modules: see [app/modules/README.md](./app/modules/README.md) before adding or importing one, and follow [CODING_STANDARDS.md](./CODING_STANDARDS.md). Run `npm run check` before committing.

## Stack and commands

React Router (framework mode) on Node 22, with Drizzle over SQLite and Vitest. Routes are in `app/routes.ts` and `app/routes/`, and the schema is in `app/db/schema.ts`.

- `npm run dev`: dev server. `npm run build`: production build, which must pass.
- `npm run check`: formatting, lint, typecheck, module boundaries and tests. CI runs it on every pull request. `npm run format` fixes formatting.
- `npm run test:mutation`: mutation testing with Stryker, on demand only. Run it after you change a module's behaviour, to check that its tests pin that behaviour down. Target: a mutation score of 85–90%. See `docs/agents/mutation-testing.md`.
- `npm run db:generate`: write a migration after changing the schema. Commit both together.
- `npm run db:migrate`, then `npm run db:seed`: set up the database in `data/` (override with `DATABASE_PATH`). The seed only fills an empty database; `npm run db:reset` rebuilds it from scratch.
- Import from `app/` with `~/`, e.g. `~/modules/vendors`.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for trenddreamer/ship-it (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
