FROM node:24-bookworm

ARG PNPM_MINIMUM_RELEASE_AGE=1440

RUN mkdir -p /etc/apt/keyrings \
 && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      -o /etc/apt/keyrings/githubcli-archive-keyring.gpg \
 && chmod 0644 /etc/apt/keyrings/githubcli-archive-keyring.gpg \
 && printf 'deb [arch=%s signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main\n' \
      "$(dpkg --print-architecture)" \
      > /etc/apt/sources.list.d/github-cli.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential \
      ca-certificates \
      curl \
      fd-find \
      gh \
      git \
      jq \
      openssh-server \
      openssh-sftp-server \
      procps \
      python3 \
      ripgrep \
 && rm -rf /var/lib/apt/lists/* \
 && rm -f /etc/ssh/ssh_host_* \
 && ln -sf /usr/bin/fdfind /usr/local/bin/fd

ENV PNPM_HOME=/home/node/.local/share/pnpm \
    PNPM_CONFIG_GLOBAL_BIN_DIR=/home/node/.local/share/pnpm/bin \
    PNPM_CONFIG_STORE_DIR=/home/node/.local/share/pnpm/store \
    PNPM_CONFIG_MINIMUM_RELEASE_AGE=${PNPM_MINIMUM_RELEASE_AGE} \
    PATH=/home/node/.local/share/pnpm/bin:/home/node/.local/share/pnpm:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin \
    NO_PROXY=localhost,127.0.0.1,llama-swap \
    no_proxy=localhost,127.0.0.1,llama-swap

RUN npm install --global --before="$(date -u -d "${PNPM_MINIMUM_RELEASE_AGE} minutes ago" '+%Y-%m-%dT%H:%M:%SZ')" pnpm@latest \
 && mkdir -p /run/sshd /home/node/.ssh /home/node/.local/share/pnpm/bin \
 && chmod 700 /home/node/.ssh \
 && chown -R node:node /home/node/.ssh /home/node/.local \
 && printf '%s\n' 'export PATH="/home/node/.local/share/pnpm/bin:/home/node/.local/share/pnpm:$PATH"' \
      > /etc/profile.d/pnpm.sh \
 && chmod 0644 /etc/profile.d/pnpm.sh

USER node
RUN PNPM_CONFIG_STORE_DIR=/home/node/.local/share/pnpm/image-store \
    pnpm add -g --ignore-scripts @earendil-works/pi-coding-agent \
 && test "$(pnpm config get global-bin-dir)" = "$PNPM_CONFIG_GLOBAL_BIN_DIR" \
 && command -v pi \
 && pi --version

USER root
# OpenSSH refuses public-key authentication for accounts with a locked ('!')
# shadow entry when PAM is disabled. '*' remains unusable as a password while
# allowing key authentication; password and keyboard-interactive auth are
# explicitly disabled in sshd_config.
RUN usermod --password '*' node

COPY sshd_config /etc/ssh/sshd_config

EXPOSE 22/tcp

CMD ["/usr/sbin/sshd", "-D", "-e", "-f", "/etc/ssh/sshd_config"]
