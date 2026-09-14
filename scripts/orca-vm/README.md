# Orca local Docker workspace (SSH)

Per-workspace environment for Orca: each workspace boots a Docker container
from a single base image, and Orca dials into it over SSH (localhost only).
No `orca serve` runs inside the container — this mirrors how VS Code talks to
Dev Containers, minus the VS Code server.

## Pieces

| File | Role |
|---|---|
| `Dockerfile` | Base image (toolchain-only): devcontainer toolchain (minus uv/omnigent/tmux) + build-essential + openssh-server + pi + copilot |
| `entrypoint.sh` | First-start host keys (`ssh-keygen -A`), prepares bind mounts, execs `sshd -D` |
| `docker-base-snapshot.sh` | Hand-run: builds the base image (generates the desktop SSH key if missing) |
| `docker-create.sh` | Recipe `create`: boots container with the host checkout bind-mounted, records host key, smoke-tests the target, prints SSH connection JSON |
| `docker-suspend.sh` | `docker stop` (data retained) |
| `docker-resume.sh` | `docker start` + fresh recipe JSON (port may change) |
| `docker-destroy.sh` | `docker rm -f` + removes the matching `known_hosts` entry |
| `docker-ssh-lib.sh` | Shared helpers (state, known_hosts, sshd wait, JSON emit) |
| `docker-state.json` | Non-secret wiring (image name, repo URL/ref, paths) |
| `orca-docker-ssh_key(.pub)` | Desktop SSH keypair. Both halves are gitignored and machine-local: `docker-base-snapshot.sh` generates them on first run, and the local public half is baked into the image at build time |

## First-time setup

1. `scripts/orca-vm/docker-base-snapshot.sh`
   (a few minutes: pulls the base image and installs tools — the repo is not
   cloned into the image)
2. Commit `orca.yaml` + `scripts/orca-vm/` to `main` (the "Run on" picker
   reads recipes from the primary checkout only)
3. `orca-ide vm recipe doctor docker-ssh --repo-path . --json` (static, free)
4. `orca-ide vm recipe doctor docker-ssh --repo-path . --provision --json`
   (boots a real container, validates the result, destroys it again)
5. Create a workspace with **Run on: Local Docker (SSH)**.

## Why there is no auth image

The guide's default model bakes agent auth into a second image
(`docker commit` after an interactive login). Here, agent state is shared from
the host with the same bind mounts the production devcontainer uses:

- `~/.pi` → `/home/node/.pi` (pi credentials + settings, read-write)
- `~/.copilot` → `/home/node/.copilot` (copilot state, read-write)
- `~/.gitconfig` → `/home/node/.gitconfig` (read-only)
pi and copilot are authenticated on the host, and every container sees the
same shared setup — no interactive in-container login phase, and logins stay
shared across all containers. To (re-)authenticate, run `pi` or `copilot` in
a container terminal (`docker exec -it <container> -u node bash`); the
credentials land in the host directories and are shared with every other
container.

Caveat: two running containers share those directories live. Config/token
files are low risk, but avoid running two copilot sessions at once
(`session-store.db` is sqlite).

## Why the checkout is bind-mounted (not cloned into the image)

The guide's base-snapshot pattern clones the repo into the image because that
pattern targets *remote* environments where no host checkout exists to share.
This container is local, so `docker-create.sh` bind-mounts the host checkout
(`<repo root>` → `/home/node/mirror-table`), exactly like the devcontainer:

- files edited on the host are live in the container and vice versa
- the container sees the exact git state the desktop Orca sees (branch,
  uncommitted changes, refs) — no sync step
- the image is toolchain-only: faster builds, never stale

Caveat: Orca's worktrees register metadata in the primary repo's
`.git/worktrees/` (your host's, via the mount) while the worktree files live
in the container. Normal workspace deletion via Orca cleans this up; if a
container is ever killed out-of-band (`docker rm -f`), run `git worktree
prune` on the host to remove any stale entry.

The host user and the container's `node` user must share a UID (1000 on this
machine) for files to be writable from both sides — the same assumption the
devcontainer makes with `updateRemoteUserUID`.

## Persistence

- Suspend/resume keeps the **same container**: worktrees, `node_modules`, and
  the pnpm store survive.- Destroy removes the container only; the shared pnpm store volume
  (`orca-mirror-table-pnpm-store`) survives. Reset it with
  `docker volume rm orca-mirror-table-pnpm-store`.
- The store volume is deliberately separate from the devcontainer's
  `mirror-table-pnpm-store` volume.

## Rebuilding the image

Re-run `scripts/orca-vm/docker-base-snapshot.sh` after: changing the
Dockerfile, adding/updating agent CLIs, or rotating the desktop SSH key (the
local public key is baked into the image at build time).

## Notes

- The image ships `build-essential` because Orca drops `orca-relay` on the
  SSH target and compiles it there at connect time; without a toolchain the
  workspace reports as running but terminals never activate.
- The container's SSH port is a random localhost port. `docker-create.sh`
  records the container's public host key under `[127.0.0.1]:<port>` in
  `~/.ssh/known_hosts` (other endpoints are preserved) and
  `docker-destroy.sh` removes that entry only if it still matches the
  destroyed container's key. Host-key checking is never disabled.
- Each container generates unique SSH host keys on first start; the images
  ship without host keys, so no two workspaces share a host identity.
- The Nuxt app (port 3000) is not published to the desktop by default. To
  reach it, add `-p 127.0.0.1::3000` to the `docker run` in
  `docker-create.sh` and a `portForwards` entry in the emitted JSON.
- `.devcontainer/` is untouched and remains the VS Code fallback. If you
  change its Dockerfile or post-create.sh, sync `Dockerfile` here manually.