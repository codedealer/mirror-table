#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

[[ -f "$ORCA_CLIENT_PRIVATE_KEY" ]] || fail "client identity missing: $ORCA_CLIENT_PRIVATE_KEY"
[[ -f "${ORCA_STATE_DIR}/authorized_keys" ]] || fail "run setup.sh before orca-up.sh"
[[ -f "${ORCA_STATE_DIR}/ssh-host-keys/ssh_host_ed25519_key" ]] || fail "run setup.sh before orca-up.sh"
compose config --quiet

# Starting is deliberately separate from building/recreating. This preserves
# the same container and named cache when Orca reconnects.
compose up -d --no-build --no-recreate ssh
container="orca-mirror-table-dev"

for attempt in $(seq 1 60); do
  status="$(docker inspect --format '{{.State.Status}}' "$container" 2>/dev/null || true)"
  if [[ "$status" == running ]]; then
    health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container")"
    [[ "$health" == healthy ]] && break
  elif [[ -n "$status" && "$status" != created ]]; then
    fail "container entered unexpected state '$status'; inspect: docker logs $container"
  fi
  sleep 1
done
[[ "$(docker inspect --format '{{.State.Health.Status}}' "$container")" == healthy ]] \
  || fail "container did not become healthy; inspect: docker logs $container"

published="$(docker port "$container" 22/tcp | head -n1)"
[[ "$published" == "${ORCA_SSH_BIND_IP}:${ORCA_SSH_PORT}" ]] \
  || fail "unexpected SSH publish '$published' (expected ${ORCA_SSH_BIND_IP}:${ORCA_SSH_PORT})"

# Read the server public key from the running container (trusted Docker
# runtime), compare it with persistent host state, then pin only that exact key.
host_pub="$(compose exec -T ssh cat /etc/ssh/host-keys/ssh_host_ed25519_key.pub | tr -d '\r')"
expected_pub="$(cat "${ORCA_STATE_DIR}/ssh-host-keys/ssh_host_ed25519_key.pub")"
[[ "$(awk '{print $1, $2}' <<<"$host_pub")" == "$(awk '{print $1, $2}' <<<"$expected_pub")" ]] \
  || fail "container host key differs from persistent host state; refusing to trust it"

mkdir -p "$(dirname "$KNOWN_HOSTS_FILE")"
chmod 700 "$(dirname "$KNOWN_HOSTS_FILE")"
touch "$KNOWN_HOSTS_FILE"
chmod 600 "$KNOWN_HOSTS_FILE"
endpoint="[${ORCA_SSH_BIND_IP}]:${ORCA_SSH_PORT}"
existing="$(ssh-keygen -F "$endpoint" -f "$KNOWN_HOSTS_FILE" 2>/dev/null || true)"
existing_keys="$(awk '!/^#/ && NF >= 3 { print $2, $3 }' <<<"$existing")"
expected_id="$(awk '{print $1, $2}' <<<"$host_pub")"
if [[ -n "$existing_keys" ]]; then
  while IFS= read -r known_key; do
    [[ "$known_key" == "$expected_id" ]] \
      || fail "host-key mismatch for ${endpoint}; inspect the existing pin before any deliberate rotation"
  done <<<"$existing_keys"
else
  printf '%s %s\n' "$endpoint" "$host_pub" >> "$KNOWN_HOSTS_FILE"
  log "pinned the Docker-verified host key for ${endpoint} in ${KNOWN_HOSTS_FILE}"
fi

remote_check="$(printf 'project_root=%q; export project_root; %s' "$PROJECT_ROOT" 'set -eu
   printf "SSH user: "; id
   printf "Project root: "; git -C "$project_root" rev-parse --show-toplevel
   test -w "$project_root"
   printf "Tools:"
   for tool in git node pnpm pi gh make g++ python3; do command -v "$tool"; done
   printf "Node: "; node --version
   printf "pnpm: "; pnpm --version
   store_path="$(pnpm store path)"
   case "$store_path" in
     /home/node/.local/share/pnpm/store/*) printf "pnpm store: %s\n" "$store_path" ;;
     *) printf "pnpm store is outside the named cache volume: %s\\n" "$store_path" >&2; exit 1 ;;
   esac
   printf "Pi: "; pi --version
   gh auth status >/dev/null
   printf "GitHub CLI authentication: available (read-only host config)\n"
   printf "llama-swap: "; getent hosts llama-swap')"
ssh -i "$ORCA_CLIENT_PRIVATE_KEY" \
  -p "$ORCA_SSH_PORT" \
  -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$KNOWN_HOSTS_FILE" \
  -o BatchMode=yes \
  "${ORCA_SSH_USER}@${ORCA_SSH_BIND_IP}" \
  "$remote_check"

fingerprint="$(ssh-keygen -lf "${ORCA_STATE_DIR}/ssh-host-keys/ssh_host_ed25519_key.pub" | awk '{print $2}')"
printf '\nOrca direct SSH target is ready:\n'
printf '  Host: %s\n  Port: %s/TCP\n  Username: %s\n  Project root: %s\n' \
  "$ORCA_SSH_BIND_IP" "$ORCA_SSH_PORT" "$ORCA_SSH_USER" "$PROJECT_ROOT"
printf '  Client identity: %s\n  Host-key fingerprint: %s\n' \
  "$ORCA_CLIENT_PRIVATE_KEY" "$fingerprint"
printf '  Add a direct SSH target in the paired Orca client UI; do not add a relay hop.\n'
