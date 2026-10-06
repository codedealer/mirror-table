#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(git -C "${SCRIPT_DIR}/../.." rev-parse --show-toplevel)"

export ORCA_PROJECT_ROOT="$PROJECT_ROOT"
export ORCA_WORKTREE_ROOT="${ORCA_WORKTREE_ROOT:-$(dirname "$PROJECT_ROOT")/mirror-table-worktrees}"
export ORCA_STATE_DIR="${ORCA_STATE_DIR:-$HOME/.local/share/orca/mirror-table}"
export ORCA_SSH_PORT="${ORCA_SSH_PORT:-6223}"
export ORCA_SSH_USER="node"
export ORCA_CLIENT_PRIVATE_KEY="${ORCA_CLIENT_PRIVATE_KEY:-$HOME/.ssh/orca-mirror-table}"
export GH_CONFIG_DIR="${GH_CONFIG_DIR:-$HOME/.config/gh}"
export PNPM_STORE_VOLUME="${PNPM_STORE_VOLUME:-orca-mirror-table-pnpm-store}"

COMPOSE_FILE="${SCRIPT_DIR}/compose.yaml"
COMPOSE_PROJECT_NAME="orca-mirror-table"
KNOWN_HOSTS_FILE="${HOME}/.ssh/known_hosts"
ORCA_LOCAL_CONFIG="${ORCA_LOCAL_CONFIG:-$HOME/.config/orca/mirror-table.env}"

compose() {
  docker compose --project-name "$COMPOSE_PROJECT_NAME" --file "$COMPOSE_FILE" "$@"
}

fail() {
  printf '[orca-singleton] ERROR: %s\n' "$*" >&2
  exit 1
}

log() {
  printf '[orca-singleton] %s\n' "$*" >&2
}

# Keep machine-specific network configuration outside the checkout. An
# explicitly exported environment variable takes precedence over this file.
if [[ -z "${ORCA_SSH_BIND_IP:-}" && -f "$ORCA_LOCAL_CONFIG" ]]; then
  # This is a user-owned shell config; only load a file you trust.
  source "$ORCA_LOCAL_CONFIG"
fi
[[ -n "${ORCA_SSH_BIND_IP:-}" ]] || fail "set ORCA_SSH_BIND_IP to this host's LAN address, or configure it in ${ORCA_LOCAL_CONFIG}"
export ORCA_SSH_BIND_IP
