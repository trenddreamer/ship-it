#!/usr/bin/env bash
# The repo's pre-commit hook, run by husky from .husky/pre-commit.
# Agents: when this rejects a commit, fix the work and commit again.
# Never bypass it (no --no-verify) and never edit it to get a commit through.
#
# Budget: this hook must finish in under 3 seconds. Only fast, staged-file
# checks belong here. Typecheck, tests and the boundary lint grow with the
# codebase, so they run in `npm run check` and CI, not here.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

scripts/check-file-tokens.sh
