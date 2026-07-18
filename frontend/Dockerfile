FROM node:24-bookworm-slim

WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=4096"

CMD ["sh", "-c", "npm install && npm run dev -- --hostname 0.0.0.0"]
