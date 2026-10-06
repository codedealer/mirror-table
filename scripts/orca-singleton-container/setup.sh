#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

case "${ORCA_STATE_DIR}" in
  "${PROJECT_ROOT}"|"${PROJECT_ROOT}"/*)
    fail "persistent SSH state must stay outside the repository: ${ORCA_STATE_DIR}"
    ;;
esac

[[ -d "$HOME/.pi" ]] || fail "missing required host state directory: $HOME/.pi"
[[ -d "$HOME/.agents" ]] || fail "missing required host state directory: $HOME/.agents"
[[ -d "$GH_CONFIG_DIR" ]] || fail "missing GitHub CLI config directory: $GH_CONFIG_DIR"
[[ -f "$HOME/.gitconfig" ]] || fail "missing Git config: $HOME/.gitconfig"
[[ -f "${ORCA_CLIENT_PRIVATE_KEY}" ]] || fail "missing Orca client identity: ${ORCA_CLIENT_PRIVATE_KEY}"
[[ -f "${ORCA_CLIENT_PRIVATE_KEY}.pub" ]] || fail "missing public client identity: ${ORCA_CLIENT_PRIVATE_KEY}.pub"
[[ -d "$PROJECT_ROOT/.git" || -f "$PROJECT_ROOT/.git" ]] || fail "project checkout not found: $PROJECT_ROOT"
[[ "$ORCA_SSH_PORT" =~ ^[0-9]+$ ]] || fail "SSH port must be numeric: $ORCA_SSH_PORT"
(( ORCA_SSH_PORT >= 6000 && ORCA_SSH_PORT <= 9999 )) || fail "SSH port must be within 6000-9999"

# The retained client identity must be usable without asking a remote process
# for a passphrase. Never copy the private half into the image or repository.
client_private_pub="$(ssh-keygen -y -P '' -f "$ORCA_CLIENT_PRIVATE_KEY" 2>/dev/null)" \
  || fail "client identity is encrypted or invalid; prepare a client-local key usable by Orca"
client_private_id="$(awk '{print $1, $2}' <<<"$client_private_pub")"
client_public_id="$(awk '{print $1, $2}' "${ORCA_CLIENT_PRIVATE_KEY}.pub")"
[[ "$client_private_id" == "$client_public_id" ]] || fail "client private/public keypair does not match"

install -d -m 700 "$ORCA_STATE_DIR" "${ORCA_STATE_DIR}/ssh-host-keys" "$HOME/.ssh"
mkdir -p "$ORCA_WORKTREE_ROOT"
if ! docker volume inspect "$PNPM_STORE_VOLUME" >/dev/null 2>&1; then
  docker volume create --name "$PNPM_STORE_VOLUME" >/dev/null
  log "created package-download cache volume ${PNPM_STORE_VOLUME}"
fi

# Keep every pre-existing authorized key; add only this client identity if it
# is not already present.
authorized_keys="${ORCA_STATE_DIR}/authorized_keys"
if [[ ! -e "$authorized_keys" ]]; then
  install -m 600 /dev/null "$authorized_keys"
fi
chmod 600 "$authorized_keys"
if ! awk -v identity="$client_public_id" '($1 " " $2) == identity { found = 1 } END { exit !found }' "$authorized_keys"; then
  cat "${ORCA_CLIENT_PRIVATE_KEY}.pub" >> "$authorized_keys"
  chmod 600 "$authorized_keys"
  log "added the retained client public key to ${authorized_keys}"
fi

host_private="${ORCA_STATE_DIR}/ssh-host-keys/ssh_host_ed25519_key"
host_public="${host_private}.pub"
if [[ ! -e "$host_private" && -e "$host_public" ]]; then
  fail "host public key exists without its private key; refusing to replace or repair it"
elif [[ ! -e "$host_private" ]]; then
  ssh-keygen -q -t ed25519 -N '' -C mirror-table-orca-host -f "$host_private"
  log "generated persistent Ed25519 SSH server host key"
fi
if [[ ! -e "$host_public" ]]; then
  ssh-keygen -y -P '' -f "$host_private" > "$host_public"
fi
chmod 600 "$host_private"
chmod 644 "$host_public"

host_private_pub="$(ssh-keygen -y -P '' -f "$host_private" 2>/dev/null)" \
  || fail "persistent server host key is invalid or encrypted"
[[ "$(awk '{print $1, $2}' <<<"$host_private_pub")" == "$(awk '{print $1, $2}' "$host_public")" ]] \
  || fail "persistent server host keypair does not match"

log "prepared host-side state at ${ORCA_STATE_DIR}"
log "project root: ${PROJECT_ROOT}"
log "linked worktrees must stay under the mounted path: ${ORCA_WORKTREE_ROOT}"
log "client identity: ${ORCA_CLIENT_PRIVATE_KEY}"
log "server host-key fingerprint: $(ssh-keygen -lf "$host_public" | awk '{print $2}')"
