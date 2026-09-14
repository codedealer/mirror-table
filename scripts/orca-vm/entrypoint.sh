#!/usr/bin/env bash
# Container entrypoint (runs as root). Starts sshd with a per-container host
# identity and prepares the bind-mounted host directories.
set -euo pipefail

# Unique SSH host keys on first start; retained for this container's lifetime
# (docker stop/start keeps them). Images ship without host keys, so no two
# containers can ever share a host identity.
if [ ! -f /etc/ssh/ssh_host_ed25519_key ]; then
  ssh-keygen -A
fi

# sshd privilege-separation directory.
mkdir -p /run/sshd
chmod 755 /run/sshd

# Bind-mounted host paths are root-owned only when Docker creates them fresh
# (empty directory or empty file). Hand those to the node user (uid 1000).
# Never chown populated host directories: that would rewrite ownership on the
# host itself.
for path in /home/node/.pi /home/node/.copilot /home/node/.gitconfig; do
  if [ -d "$path" ]; then
    if [ -z "$(ls -A "$path" 2>/dev/null)" ]; then
      chown 1000:1000 "$path" 2>/dev/null || echo "entrypoint: warning: could not chown $path" >&2
    fi
  elif [ -f "$path" ] && [ ! -s "$path" ]; then
    chown 1000:1000 "$path" 2>/dev/null || echo "entrypoint: warning: could not chown $path" >&2
  fi
done

exec /usr/sbin/sshd -D -e