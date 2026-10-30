#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

minimum_release_age="$(awk '$1 == "minimumReleaseAge:" { print $2; exit }' "${PROJECT_ROOT}/pnpm-workspace.yaml")"
[[ "$minimum_release_age" =~ ^[0-9]+$ ]] \
  || fail "pnpm-workspace.yaml must configure a numeric minimumReleaseAge before building the container"
export PNPM_MINIMUM_RELEASE_AGE="$minimum_release_age"

compose config --quiet
compose build ssh "$@"
