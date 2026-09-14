#!/usr/bin/env bash
# Suspend the workspace container: docker stop (data is retained).
# Reads the lifecycle payload on stdin; no stdout output required.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/docker-ssh-lib.sh"

payload="$(cat)"
resource_id="$(node -e 'const d=JSON.parse(process.argv[1]); process.stdout.write(d.recipeResult?.userData?.resourceId ?? "")' "$payload")"
[ -n "$resource_id" ] || die "no resource id in lifecycle payload"

log "suspending container $resource_id"
docker stop -t 30 "$resource_id" >&2
log "suspended $resource_id"