# syntax=docker/dockerfile:1.7
FROM node:22.16.0-alpine AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY package.json pnpm-workspace.yaml ./
COPY apps/platform-api/package.json apps/platform-api/package.json
RUN pnpm install --filter @ptc-bale/platform-api... --no-frozen-lockfile
COPY apps/platform-api apps/platform-api
RUN pnpm --filter @ptc-bale/platform-api db:generate
RUN pnpm --filter @ptc-bale/platform-api build
RUN pnpm --filter @ptc-bale/platform-api --prod deploy --legacy /runtime

FROM node:22.16.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S -G app app
COPY --from=build --chown=app:app /runtime ./
COPY --from=build --chown=app:app /workspace/apps/platform-api/dist ./dist
USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/healthz >/dev/null || exit 1
CMD ["node", "dist/server.js"]
