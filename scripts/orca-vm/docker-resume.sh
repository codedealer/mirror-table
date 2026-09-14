#!/usr/bin/env bash
# Resume the suspended workspace container: docker start, then re-emit fresh
# recipe JSON (the published port may have changed).
# Reads the lifecycle payload on stdin; prints exactly one JSON object on
# stdout; all progress goes to stderr.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/docker-ssh-lib.sh"
cd "$SCRIPT_DIR/../.."

payload="$(cat)"
resource_id="$(node -e 'const d=JSON.parse(process.argv[1]); process.stdout.write(d.recipeResult?.userData?.resourceId ?? "")' "$payload")"
[ -n "$resource_id" ] || die "no resource id in lifecycle payload"

ssh_user="$(state_get sshUser)"; ssh_user="${ssh_user:-node}"
project_root="$(state_get projectRoot)"; project_root="${project_root:-/home/node/mirror-table}"
app_port="$(state_get appPort)"
key_rel="$(state_get keyPath)"; key_rel="${key_rel:-scripts/orca-vm/orca-docker-ssh_key}"
key="$PWD/$key_rel"
[ -f "$key" ] || die "desktop SSH key not found at $key"

log "resuming container $resource_id"
docker start "$resource_id" >&2

port="$(docker port "$resource_id" 22/tcp | head -n1 | awk -F: '{print $NF}')"
[ -n "$port" ] || die "could not read the published SSH port for $resource_id"
log "SSH on 127.0.0.1:${port}"

# The container keeps its host keys across stop/start; refresh the entry for
# this endpoint in case the port was reassigned.
wait_sshd "$port" "$resource_id"
host_pubkey="$(docker exec "$resource_id" cat /etc/ssh/ssh_host_ed25519_key.pub)"
known_hosts_update "$port" "$host_pubkey"

emit_connection_json "$port" "$resource_id" "$app_port"
log "resumed $resource_id"