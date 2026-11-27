#!/usr/bin/env bash
# Sets the Factory's Actions secrets on the repos it runs in, for enrolment
# and for rotation. See docs/enrolment/README.md.
#
# Usage: scripts/set-factory-secrets.sh [--dry-run] [owner/name]
#
# With no repo, it sets them on the Home repo and on every Enrolled repo in
# the Registry (repos.yml). Named, it sets them on that one repo, which must
# be the Home repo or in the Registry.
#
#   Enrolled repo   CLAUDE_CODE_OAUTH_TOKEN, FACTORY_APP_ID,
#                   FACTORY_APP_PRIVATE_KEY: its caller workflow passes all
#                   three to the shared Factory workflows.
#   Home repo       FACTORY_APP_ID, FACTORY_APP_PRIVATE_KEY, for the routing
#                   job and the spec queue's survey. It gets the Claude token
#                   too only while the Registry lists it as an Enrolled repo.
#
# It asks for each value on stdin. Leave one blank to keep that secret as it
# is, e.g. to rotate only the Claude token. The Claude token is read without
# echo. The App's private key spans several lines, so give the path to its
# .pem file instead.
#
# No value ever reaches a command line or the output: each goes to
# `gh secret set` on its stdin. Don't add `set -x` or `--body`.
#
# --dry-run reads the values and lists what it would set, and calls nothing.
set -euo pipefail

HOME_REPO="trenddreamer/ship-it"
REGISTRY="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/repos.yml"

fail() {
  echo "set-factory-secrets: $*" >&2
  exit 1
}

dry_run=false
named=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=true ;;
    -h | --help)
      sed -n '2,/^set -euo/p' "${BASH_SOURCE[0]}" | sed '$d; s/^# \{0,1\}//'
      exit 0
      ;;
    -*) fail "unknown option $arg. Try --help." ;;
    *)
      [[ -z "$named" ]] || fail "name one repo at most."
      named="$arg"
      ;;
  esac
done

# The Enrolled repos in the Registry, one `owner/name` per line. repos.yml is
# a plain list of `label:`/`repo:` pairs, so this reads it without yq; it
# fails rather than guess when the file isn't in that shape.
registry_repos() {
  local line value found=0 entries labels
  local pattern='^[[:space:]]*-?[[:space:]]*repo:[[:space:]]*["'\'']?([^"'\''#[:space:]]+)'
  local owner_name='^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'
  [[ -r "$REGISTRY" ]] || fail "can't read the Registry, $REGISTRY."
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ $pattern ]] || continue
    value="${BASH_REMATCH[1]}"
    [[ "$value" =~ $owner_name ]] || fail "repos.yml: \`$value\` isn't owner/name."
    printf '%s\n' "$value"
    found=$((found + 1))
  done < "$REGISTRY"
  entries=$(grep -cE '^[[:space:]]*-' "$REGISTRY" || true)
  labels=$(grep -cE '^[[:space:]]*-[[:space:]]*label:' "$REGISTRY" || true)
  ((found > 0)) || fail "repos.yml lists no repos."
  ((found == entries && found == labels)) ||
    fail "repos.yml isn't in the shape this reads. Write each entry as \`- label: ...\` then \`repo: owner/name\`."
}

enrolled=$(registry_repos | awk '!seen[$0]++')
is_enrolled() { grep -qxF "$1" <<< "$enrolled"; }

if [[ -n "$named" ]]; then
  [[ "$named" == "$HOME_REPO" ]] || is_enrolled "$named" ||
    fail "$named is neither the Home repo nor in the Registry. Enrol it in repos.yml first."
  targets="$named"
else
  targets=$(printf '%s\n%s\n' "$HOME_REPO" "$enrolled" | awk '!seen[$0]++')
fi

ask() { printf '%s' "$1" >&2; }
# Ends the prompt's line when the typing didn't: a hidden read, or a pipe.
answered() { [[ "${1:-}" != hidden && -t 0 ]] || echo >&2; }

ask "Claude token (CLAUDE_CODE_OAUTH_TOKEN), blank to keep: "
IFS= read -rs claude_token || claude_token=""
answered hidden
ask "Factory App's ID (FACTORY_APP_ID), blank to keep: "
IFS= read -r app_id || app_id=""
answered
ask "Path to the Factory App's private key, a .pem file (FACTORY_APP_PRIVATE_KEY), blank to keep: "
IFS= read -r key_file || key_file=""
answered

if [[ -n "$key_file" ]]; then
  key_file="${key_file/#\~/$HOME}"
  [[ -r "$key_file" ]] || fail "can't read $key_file."
  grep -q -- '-----BEGIN .*PRIVATE KEY-----' "$key_file" ||
    fail "$key_file doesn't look like a private key (.pem)."
fi
[[ -n "$claude_token$app_id$key_file" ]] || fail "nothing to set: every value was blank."

# Sets secret $1 on repo $2 from stdin.
put() {
  if $dry_run; then
    cat > /dev/null
    echo "Would set $1 on $2"
  else
    gh secret set "$1" -R "$2"
  fi
}

while IFS= read -r repo; do
  if [[ -n "$claude_token" ]] && is_enrolled "$repo"; then
    printf '%s' "$claude_token" | put CLAUDE_CODE_OAUTH_TOKEN "$repo"
  fi
  if [[ -n "$app_id" ]]; then
    printf '%s' "$app_id" | put FACTORY_APP_ID "$repo"
  fi
  if [[ -n "$key_file" ]]; then
    put FACTORY_APP_PRIVATE_KEY "$repo" < "$key_file"
  fi
done <<< "$targets"
