#!/usr/bin/env bash
# Destroy the workspace container: docker rm -f. The shared pnpm store volume
# is intentionally kept. Removes the known_hosts entry for this container's
# endpoint only, and only if it still matches this container's host key.
# Reads the lifecycle payload on stdin; no stdout output required.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/docker-ssh-lib.sh"

payload="$(cat)"
resource_id="$(node -e 'const d=JSON.parse(process.argv[1]); process.stdout.write(d.recipeResult?.userData?.resourceId ?? "")' "$payload")"
[ -n "$resource_id" ] || die "no resource id in lifecycle payload"

if ! docker ps -a --format '{{.Names}}' | grep -qxF "$resource_id"; then
  log "container $resource_id not found; nothing to do"
  exit 0
fi

port="$(docker port "$resource_id" 22/tcp 2>/dev/null | head -n1 | awk -F: '{print $NF}' || true)"
# docker cp to stdout prepends a header with null bytes; copy to a temp file
# instead so the key text is clean.
key_tmp="$(mktemp)"
docker cp "$resource_id:/etc/ssh/ssh_host_ed25519_key.pub" "$key_tmp" 2>/dev/null || true
pubkey="$(cat "$key_tmp" 2>/dev/null || true)"
rm -f "$key_tmp"

docker rm -f "$resource_id" >&2
log "removed container $resource_id"

known_hosts="${HOME}/.ssh/known_hosts"
if [ -n "$port" ] && [ -n "$pubkey" ] && [ -f "$known_hosts" ]; then
  expected="[127.0.0.1]:${port} ${pubkey}"
  if grep -qxF "$expected" "$known_hosts"; then
    grep -vxF "$expected" "$known_hosts" > "${known_hosts}.tmp" && mv "${known_hosts}.tmp" "$known_hosts"
    log "removed known_hosts entry for [127.0.0.1]:${port}"
  fi
fi