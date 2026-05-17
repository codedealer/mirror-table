FROM mcr.microsoft.com/devcontainers/typescript-node:24-bookworm

RUN apt-get update \
 && apt-get install -y \
    ripgrep \
    fd-find \
 && rm -rf /var/lib/apt/lists/*

# Create a symlink so the agent can use 'fd' instead of 'fdfind'
RUN ln -s /usr/bin/fdfind /usr/bin/fd

RUN mkdir -p \
    /home/node/.pnpm-store \
    /home/node/.vscode-server/bin \
    /home/node/.vscode-server/data/Machine \
    /home/node/.vscode-server/data/User/workspaceStorage \
  && chown -R node:node /home/node/.pnpm-store /home/node/.vscode-server
