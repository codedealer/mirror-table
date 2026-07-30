FROM mcr.microsoft.com/devcontainers/typescript-node:24-bookworm

RUN apt-get update \
 && apt-get install -y \
      ca-certificates \
      curl \
    ripgrep \
    fd-find \
    tmux \
 && rm -rf /var/lib/apt/lists/*

# Create a symlink so the agent can use 'fd' instead of 'fdfind'
RUN ln -s /usr/bin/fdfind /usr/bin/fd

ENV PNPM_HOME=/home/node/.local/share/pnpm \
   PATH=/home/node/.local/bin:/home/node/.local/share/pnpm/bin:${PATH}

RUN mkdir -p \
    /home/node/.pnpm-store \
    /home/node/.vscode-server/bin \
    /home/node/.vscode-server/data/Machine \
    /home/node/.vscode-server/data/User/workspaceStorage \
      /home/node/.local/bin \
      /home/node/.local/share/pnpm \
   && chown -R node:node /home/node/.pnpm-store /home/node/.vscode-server /home/node/.local

RUN corepack enable --install-directory /home/node/.local/bin

USER node

RUN curl -LsSf https://astral.sh/uv/install.sh -o /tmp/uv-install.sh \
 && sh /tmp/uv-install.sh \
 && rm /tmp/uv-install.sh \
 && corepack prepare pnpm@11.17.0 --activate \
 && pnpm config set store-dir /home/node/.pnpm-store \
 && uv tool install --python 3.12 --with "omnigent[copilot]" omnigent
