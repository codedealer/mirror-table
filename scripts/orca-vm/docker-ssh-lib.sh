#!/usr/bin/env bash
# Shared helpers for the Orca local-Docker (SSH) recipe scripts. Sourced, not
# executed. Every helper keeps stdout clean: progress and errors go to stderr.
#
# Callers must set SCRIPT_DIR before sourcing and provide state.json next to
# themselves. emit_connection_json additionally expects the globals
# $ssh_user, $key, and $project_root to be resolved by the caller.

log() { echo "[orca-docker] $*" >&2; }
die() { log "ERROR: $*"; exit 1; }

state_file="${SCRIPT_DIR}/docker-state.json"

# Read a value from the state file ("" when absent).
state_get() {
  node -e '
    const fs = require("fs");
    let s = {};
    try { s = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch {}
    const v = s[process.argv[2]];
    process.stdout.write(v == null ? "" : String(v));
  ' "$state_file" "$1"
}

# Replace the known_hosts entry for [127.0.0.1]:<port> with the container's
# current public host key. Entries for other endpoints are preserved; host-key
# checking is never disabled.
#   $1=published port  $2="keytype base64 comment"
known_hosts_update() {
  local port="$1" pubkey="$2"
  local known_hosts="${HOME}/.ssh/known_hosts"
  mkdir -p "${HOME}/.ssh" && chmod 700 "${HOME}/.ssh"
  touch "$known_hosts" && chmod 600 "$known_hosts"
  grep -v -F "[127.0.0.1]:${port} " "$known_hosts" > "${known_hosts}.tmp" || true
  mv "${known_hosts}.tmp" "$known_hosts"
  printf '[127.0.0.1]:%s %s\n' "$port" "$pubkey" >> "$known_hosts"
}

# Wait until sshd on 127.0.0.1:<port> accepts connections (max ~60s).
#   $1=published port  $2=container name
wait_sshd() {
  local port="$1" name="$2" i
  for i in $(seq 1 60); do
    if timeout 1 bash -c "exec 3<>/dev/tcp/127.0.0.1/${port}" 2>/dev/null; then
      return 0
    fi
    docker ps --filter "name=^${name}$" --format '{{.Status}}' | grep -q 'Up' \
      || die "container ${name} stopped while waiting for sshd: $(docker logs --tail 20 "$name" 2>&1)"
    sleep 1
  done
  die "sshd on 127.0.0.1:${port} did not come up within 60s"
}

# Print the recipe-result JSON (SSH mode) on stdout.
#   $1=published port  $2=container name (used as label and resourceId)
emit_connection_json() {
  local port="$1" name="$2"
  node -e '
    const [port, user, key, root, label] = process.argv.slice(1, 6);
    const target = {
      label,
      host: "127.0.0.1",
      port: Number(port),
      username: user,
      identityFile: key,
      identitiesOnly: true,
    };
    process.stdout.write(JSON.stringify({
      schemaVersion: 1,
      connection: { type: "ssh", projectRoot: root, target },
      userData: { provider: "docker", resourceId: label },
    }, null, 2) + "\n");
  ' "$port" "$ssh_user" "$key" "$project_root" "$name"
}