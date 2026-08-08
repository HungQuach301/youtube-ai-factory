FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY scripts/media-executor.mjs ./media-executor.mjs

USER node
CMD ["node", "/app/media-executor.mjs", "--once"]
