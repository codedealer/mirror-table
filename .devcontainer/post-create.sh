#!/usr/bin/env bash
set -euo pipefail

corepack prepare pnpm@11.17.0 --activate

pnpm config set store-dir /home/node/.pnpm-store

pnpm add -g --ignore-scripts @earendil-works/pi-coding-agent
pnpm add -g --allow-build=@github/copilot @github/copilot

pnpm install
