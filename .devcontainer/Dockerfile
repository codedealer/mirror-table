FROM mcr.microsoft.com/devcontainers/typescript-node:24-bookworm

RUN mkdir -p \
    /home/node/.pnpm-store \
    /home/node/.vscode-server/bin \
    /home/node/.vscode-server/data/Machine \
    /home/node/.vscode-server/data/User/workspaceStorage \
  && chown -R node:node /home/node/.pnpm-store /home/node/.vscode-server