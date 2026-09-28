FROM node:24-bookworm-slim AS node

FROM python:3.12-bookworm

ENV DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/bin/npm /usr/local/bin/npm
COPY --from=node /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm

RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && apt-get update && apt-get install -y --no-install-recommends git ca-certificates xvfb x11vnc novnc websockify \
    && rm -rf /var/lib/apt/lists/* \
    && python -m pip install --no-cache-dir browsergym-miniwob==0.14.3 \
      browsergym-webarena==0.14.3 browsergym-webarena-verified==0.14.3 \
      webarena-verified==1.2.3 \
    && python -m playwright install --with-deps chromium \
    && npm install --global --no-audit --no-fund agent-browser@0.38.1 \
    && git clone https://github.com/Farama-Foundation/miniwob-plusplus.git /opt/miniwob \
    && git -C /opt/miniwob checkout 7fd85d71a4b60325c6585396ec4f48377d049838 \
    && rm -rf /opt/miniwob/.git

ENV PYTHONUNBUFFERED=1
WORKDIR /work
