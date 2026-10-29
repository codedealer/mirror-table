# Orca singleton container

This is a single persistent Docker development container reached **directly** from the paired Orca client over LAN SSH. It replaces the former per-workspace `scripts/orca-vm` recipe. It does not start `orca serve`, create one container per worktree, or publish application ports.

## Host-local configuration

The host's LAN address is deliberately not stored in this repository. Before running the scripts, either export `ORCA_SSH_BIND_IP` in the shell or put it in a user-owned config file outside the checkout:

```bash
mkdir -p ~/.config/orca
chmod 700 ~/.config/orca
printf "ORCA_SSH_BIND_IP='%s'\n" '<HOST_LAN_IP>' > ~/.config/orca/mirror-table.env
chmod 600 ~/.config/orca/mirror-table.env
```

Replace `<HOST_LAN_IP>` with the address reachable from the paired Orca client. The scripts load this trusted shell config when `ORCA_SSH_BIND_IP` is not already exported; an environment value takes precedence. `ORCA_LOCAL_CONFIG` can select a different config file. Do not commit this file or put a real host address in tracked examples/docs.

The default SSH port is `6223/TCP` and can be overridden with `ORCA_SSH_PORT` (allowed range: 6000–9999). The listener binds only to the configured address, not loopback or every interface. SSH uses TCP only. Reserve the address in DHCP or update the local config if it changes.

Other defaults are derived from the checkout or the current user's home: the primary project root is the checkout path, linked worktrees go under a sibling `mirror-table-worktrees` directory, the client identity is `~/.ssh/orca-mirror-table`, and persistent server host-key state is `~/.local/share/orca/mirror-table/ssh-host-keys`. These can be customized through the corresponding environment variables in `common.sh`. `setup.sh` expects the dedicated Ed25519 client identity to already exist; its public half is added to the host-side `authorized_keys` file. The separate Ed25519 **server host key** is generated once in persistent state. Never copy either private key into the image or repository; do not replace a host key on mismatch.

## Lifecycle

Run these from the primary checkout, in order on first setup:

```bash
scripts/orca-singleton-container/setup.sh
scripts/orca-singleton-container/build.sh
scripts/orca-singleton-container/orca-up.sh
```

`setup.sh` is idempotent, creates host-side SSH state, retains any already-authorized keys, and creates the worktree parent. `build.sh` builds the separate `node:24-bookworm` development image with Node 24, pnpm 11.17.0, Pi 0.87.1, Git/GitHub CLI, OpenSSH, Python 3, and native build tools. pnpm's global bin directory is explicitly configured as `/home/node/.local/share/pnpm/bin`; that directory is included in both the image and non-login SSH `PATH`, and Pi is installed globally with pnpm. The startup SSH check verifies the configured global-bin-dir, `PATH` membership, and `pi` availability.

`orca-up.sh` starts the existing container without rebuilding or recreating it. `orca-down.sh` runs Compose `stop` and preserves the container and named volumes. After an intentional image rebuild, apply it separately with:

```bash
# After setup and build, explicitly replace the container while keeping its bind mounts,
# persistent host keys, and named pnpm cache. Recreate after image/config changes:
source scripts/orca-singleton-container/common.sh
compose up -d --no-build --force-recreate ssh
```

To update Pi inside a running singleton, use the SSH/Orca terminal as `node` (no shell-local `PATH` export is needed):

```bash
pnpm update --global @earendil-works/pi-coding-agent
```

After changing the image or `sshd_config`, rebuild and explicitly recreate the singleton using the commands above; `orca-up.sh` deliberately will not silently rebuild or replace it.

The main checkout and linked-worktree parent are bind-mounted at their **same absolute paths** on both sides, so Git's shared worktree metadata remains valid. Package downloads use the named `orca-mirror-table-pnpm-store` volume; the image sets pnpm's recognized `PNPM_CONFIG_STORE_DIR` setting to that mount, and `sshd_config` explicitly passes this safe non-secret setting into SSH sessions. The Pi installation baked into the image uses a separate image-local pnpm store, so the runtime cache mount cannot hide Pi's installed package files. Compose sets `ORCA_CLI_COMMAND=orca` (the SSH target's Orca relay command) and `ORCA_SINGLETON_CONTAINER=true` (the agent's environment marker), and `sshd_config` explicitly exports both into non-login SSH sessions with `SetEnv`. The remote startup check verifies both variables, changes into the checkout before querying pnpm, confirms the effective cache setting, verifies the cache volume mount, and performs a write probe under pnpm's reported store path. Worktree `node_modules` and generated state are not shared by that volume. No Docker socket, database, or other project service is mounted or published.

The workspace config sets `minimumReleaseAge: 1440`, so pnpm rejects newly selected package versions published less than 24 hours ago. This is a delay, not a substitute for reviewing dependency updates.

### Install dependencies before starting the app

The image provides Node and pnpm, but it does not contain this checkout's dependencies: the source checkout is mounted at runtime, and each worktree must have its own `node_modules`. After the SSH target is connected, run this once in the Orca terminal for each checkout/worktree:

```bash
cd /path/to/that/checkout
pnpm install --frozen-lockfile
```

Then start the app with `pnpm dev`. Dependency downloads go to the shared named cache volume; `node_modules` remains private to that checkout. Do not copy or share `node_modules` between worktrees. For a newly created worktree, install dependencies there before running scripts or starting its dev server.

## Mounts and boundaries

| Host resource | Container destination | Access / purpose |
|---|---|---|
| Primary checkout (`$ORCA_PROJECT_ROOT`) | Same absolute path | Read/write main checkout |
| Linked-worktree parent (`$ORCA_WORKTREE_ROOT`) | Same absolute path | Read/write linked worktrees; same-path Git metadata |
| `~/.pi` | `/home/node/.pi` | Read/write, full Pi configuration and agent state |
| `~/.agents` | `/home/node/.agents` | Read/write, full shared agent skills/state |
| `~/.config/gh` (or `GH_CONFIG_DIR`) | `/home/node/.config/gh` | Read-only GitHub CLI authentication/config |
| `~/.gitconfig` | `/home/node/.gitconfig` | Read-only Git identity and `gh` credential helper |
| Host SSH state (`$ORCA_STATE_DIR`) | `/home/node/.ssh/authorized_keys`, `/etc/ssh/host-keys` | Read-only public client keys and persistent server key |
| Named pnpm store | `/home/node/.local/share/pnpm/store` | Shared package-download cache only |

The checkout bind includes its ignored files; the image build context is limited to the Dockerfile and SSH configuration and does not include checkout contents or secrets. Container processes running as `node` can access the mounted checkout and the full Pi/agent state by design. Do not copy the main `.env` into worktrees. This project uses external Firebase/Google credentials; decide whether worktrees may use shared credentials/data before enabling automatic setup hooks or running parallel application tasks.

The Compose file maps `llama-swap` to Docker's host gateway, as required by the host Pi model configuration. `NO_PROXY`/`no_proxy` exclude it. This container does not run a model server.

## Orca client handoff

After the container is running, add a **direct remote SSH target** in the paired Orca client's UI using the endpoint, username, project root, and client identity printed by `orca-up.sh`. Pin/verify the server host key using the SHA256 fingerprint printed by the script. It obtains the public key from the trusted Docker runtime and adds that exact key to the host's `~/.ssh/known_hosts`; it does not trust `ssh-keyscan` output. Do not add the Orca host as an intermediate SSH hop.

Target creation is intentionally a client-UI step. These scripts do not register a target or create an Orca project-host setup. After adding and confirming the SSH target, import/set up the project once on this SSH target and reuse that setup for worktrees.

Only TCP on the configured SSH address and port is published. Configure the host/Windows/Hyper-V firewall to permit it only from the trusted LAN; these scripts do not create firewall rules. Verify SSH from another LAN device and confirm the UI target before treating LAN/Orca connectivity as established. Orca-relayed previews can be tested later; app ports are not directly published.
