#!/usr/bin/env bash
# Build the Orca-native base image for mirror-table workspaces.
# Hand-run (not part of the recipe lifecycle):
#   scripts/orca-vm/docker-base-snapshot.sh
# Re-run after changing the Dockerfile, the desktop SSH key, or the agent CLIs.
# stdout: state JSON only; all progress goes to stderr.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/docker-ssh-lib.sh"
cd "$SCRIPT_DIR/../.."

# env → state → fallback
image="${ORCA_DOCKER_IMAGE:-$(state_get imageName)}"
image="${image:-orca-mirror-table-base:latest}"

# 1. Desktop SSH keypair (private half stays on this machine and is gitignored;
#    the public half is committed and baked into the image).
key_rel="scripts/orca-vm/orca-docker-ssh_key"
key="$PWD/$key_rel"
if [ ! -f "$key" ]; then
  log "generating desktop SSH key at $key_rel"
  ssh-keygen -t ed25519 -N '' -C 'orca-mirror-table' -f "$key" >&2
fi

# 2. Build the image (context = scripts/orca-vm; the repo is cloned inside).
log "building $image (pulls the base image, installs tools, clones the repo, pnpm install — several minutes)"
docker build -t "$image" -f scripts/orca-vm/Dockerfile scripts/orca-vm >&2

# 3. Smoke-check the toolchain inside the built image (entrypoint bypassed,
#    run as the node user the way SSH sessions run).
docker run --rm --entrypoint make "$image" --version >&2
docker run --rm --user node --entrypoint /usr/local/bin/pnpm "$image" --version >&2
docker run --rm --user node --entrypoint /usr/local/bin/pi "$image" --version >&2

# 4. Merge outputs into state; print state JSON to stdout.
node -e '
  const fs = require("fs");
  const file = process.argv[1];
  let s = {};
  try { s = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
  s.imageName = process.argv[2];
  fs.writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
  process.stdout.write(JSON.stringify(s, null, 2) + "\n");
' scripts/orca-vm/docker-state.json "$image"
log "base image $image ready"