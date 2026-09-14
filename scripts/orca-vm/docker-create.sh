#!/usr/bin/env bash
# Create the per-workspace Docker container (SSH target) for mirror-table.
# The host checkout is bind-mounted (devcontainer-style), so the container
# sees the live git state of this repo. Orca runs this from the repo root;
# ORCA_* env vars carry the workspace context. Prints exactly one JSON object
# (the recipe result) on stdout; all progress goes to stderr.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/docker-ssh-lib.sh"
cd "$SCRIPT_DIR/../.."

# --- resolve inputs: env → state → fallback ----------------------------------
image="${ORCA_DOCKER_IMAGE:-$(state_get imageName)}"
image="${image:-orca-mirror-table-base:latest}"
ssh_user="${ORCA_DOCKER_SSH_USER:-$(state_get sshUser)}"
ssh_user="${ssh_user:-node}"
host_repo="${ORCA_DOCKER_HOST_REPO:-$SCRIPT_DIR/../..}"
project_root="${ORCA_DOCKER_PROJECT_ROOT:-$(state_get projectRoot)}"
project_root="${project_root:-/home/node/mirror-table}"
store_volume="${ORCA_DOCKER_PNPM_STORE:-$(state_get pnpmStoreVolume)}"
store_volume="${store_volume:-orca-mirror-table-pnpm-store}"
key_rel="$(state_get keyPath)"
key_rel="${key_rel:-scripts/orca-vm/orca-docker-ssh_key}"
key="$PWD/$key_rel"

[ -f "$key" ] || die "desktop SSH key not found at $key — run scripts/orca-vm/docker-base-snapshot.sh first"
docker image inspect "$image" >/dev/null 2>&1 \
  || die "Docker image $image not found — run scripts/orca-vm/docker-base-snapshot.sh first"
[ -e "$host_repo/.git" ] || die "no git checkout at $host_repo — run from the primary checkout (or set ORCA_DOCKER_HOST_REPO)"

# --- container name: orca-<recipe>-<instance>, sanitized, length-capped -------
raw_name="orca-${ORCA_RECIPE_ID:-docker-ssh}-${ORCA_VM_INSTANCE_ID:-workspace}"
name="$(printf '%s' "$raw_name" | tr -c 'a-zA-Z0-9-_' '_' | cut -c1-64)"
docker ps -a --format '{{.Names}}' | grep -qxF "$name" \
  && die "container $name already exists — resume it from Orca, or remove it with: docker rm -f $name"

# Clean up the container if anything below fails (success exits with 0).
created=0
cleanup() {
  local status=$?
  if [ "$status" -ne 0 ] && [ "$created" = "1" ]; then
    log "create failed — removing container $name"
    docker rm -f "$name" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# --- 1. boot the container -----------------------------------------------------
# Host bind mounts mirror the devcontainer: the live checkout, pi/copilot
# state, and git identity are shared from the host, so no in-container auth
# phase is needed.
for h in "${HOME}/.pi" "${HOME}/.copilot" "${HOME}/.gitconfig"; do
  [ -e "$h" ] || log "warning: $h does not exist on this host; Docker will create an empty mount point"
done

log "starting container $name from $image"
docker run -d \
  --name "$name" \
  --label orca.workspace=mirror-table \
  -p 127.0.0.1::22 \
  -v "${host_repo}:${project_root}" \
  -v "${store_volume}:/home/node/.pnpm-store" \
  -v "${HOME}/.pi:/home/node/.pi" \
  -v "${HOME}/.copilot:/home/node/.copilot" \
  -v "${HOME}/.gitconfig:/home/node/.gitconfig:ro" \
  --add-host llama-swap:host-gateway \
  -e NUXT_HOST=0.0.0.0 \
  -e NUXT_PORT=3000 \
  -e no_proxy="localhost,127.0.0.1,0.0.0.0,.local,llama-swap" \
  -e NO_PROXY="localhost,127.0.0.1,0.0.0.0,.local,llama-swap" \
  "$image" >/dev/null
created=1

port="$(docker port "$name" 22/tcp | head -n1 | awk -F: '{print $NF}')"
[ -n "$port" ] || die "could not read the published SSH port for $name"
log "SSH on 127.0.0.1:${port}"

# --- 2. wait for sshd (sshd cannot start without host keys, so this also
# guarantees the entrypoint's first-start key generation has finished) -------
wait_sshd "$port" "$name"

# --- 3. record this container's public host key for its endpoint only --------
host_pubkey=""
for i in $(seq 1 10); do
  host_pubkey="$(docker exec "$name" cat /etc/ssh/ssh_host_ed25519_key.pub 2>/dev/null || true)"
  [ -n "$host_pubkey" ] && break
  sleep 1
done
[ -n "$host_pubkey" ] || die "container $name has no ed25519 host key after sshd came up"
known_hosts_update "$port" "$host_pubkey"

# --- 4. smoke-test the exact target we are about to emit -----------------------
remote_check='set -euo pipefail
cd "$project_root"
echo "[check] repo: $(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD)" >&2
echo "[check] tools:" >&2
command -v git pnpm pi copilot make
pi --version >&2
'
ssh -i "$key" -p "$port" -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o BatchMode=yes \
  "${ssh_user}@127.0.0.1" \
  "$(printf 'project_root=%q bash -lc %q' "$project_root" "$remote_check")" >&2

# --- 5. emit the recipe result ---------------------------------------------------
emit_connection_json "$port" "$name"
log "workspace container $name ready"