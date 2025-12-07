# Using bun base image + node because of https://github.com/oven-sh/bun/issues/7343
FROM node:lts-alpine

ARG UID="9999" \
    GID="9999" \
    VERSION \
    BUILD_DATE \
    REVISION

LABEL org.opencontainers.image.title="Minicontrol Server Controller" \
      org.opencontainers.image.description="Server Controller for TMF, TM2, and TM2020." \
      org.opencontainers.image.authors="Nicolas Graf <nicolas.graf@evoesports.gg>" \
      org.opencontainers.image.vendor="Evo eSports e.V." \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version=${VERSION} \
      org.opencontainers.image.created=${BUILD_DATE} \
      org.opencontainers.image.revision=${REVISION}

WORKDIR /minicontrol

RUN true \
    && set -eux \
    && addgroup -g $GID minicontrol \
    && adduser -u $UID -Hh /minicontrol -G minicontrol -s /sbin/nologin -D minicontrol \
    && install -d -o minicontrol -g minicontrol -m 775 /minicontrol \
    && apk add --force-overwrite --no-cache tini python3 \
    && true

USER minicontrol

COPY --chown=minicontrol ../ /minicontrol/

RUN true \
    && set -eux \
    && npm install --production \
    && true

HEALTHCHECK --interval=5s --timeout=5s --start-period=5s --retries=3 \
    CMD [ "/bin/sh", "-c", "echo 'ping' | nc -w1 127.0.0.1 3000 | grep -qF '0' || exit 1" ]

ENTRYPOINT ["/sbin/tini", "--", "npm", "run"]
CMD [ "docker" ]
