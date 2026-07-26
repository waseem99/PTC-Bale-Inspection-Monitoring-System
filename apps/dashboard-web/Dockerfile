# syntax=docker/dockerfile:1.7

FROM node:20.18.1-alpine AS build
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-workspace.yaml ./
COPY apps/dashboard-web/package.json apps/dashboard-web/package.json
RUN pnpm install --filter @ptc-bale/dashboard-web... --no-frozen-lockfile

COPY apps/dashboard-web apps/dashboard-web

ARG VITE_DATA_MODE=mock
ARG VITE_ENVIRONMENT_NAME="Isolated Development Demo"
ARG VITE_BUILD_VERSION=container
ARG VITE_API_BASE_URL=/api
ARG VITE_DEMO_PASSWORD=
ARG VITE_ALLOW_DEMO_CREDENTIALS=false
ARG VITE_REQUEST_TIMEOUT_MS=12000
ARG VITE_MOCK_LATENCY_MS=250
ARG VITE_MOCK_FAILURE_RATE=0

ENV VITE_DATA_MODE=$VITE_DATA_MODE \
    VITE_ENVIRONMENT_NAME=$VITE_ENVIRONMENT_NAME \
    VITE_BUILD_VERSION=$VITE_BUILD_VERSION \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_DEMO_PASSWORD=$VITE_DEMO_PASSWORD \
    VITE_ALLOW_DEMO_CREDENTIALS=$VITE_ALLOW_DEMO_CREDENTIALS \
    VITE_REQUEST_TIMEOUT_MS=$VITE_REQUEST_TIMEOUT_MS \
    VITE_MOCK_LATENCY_MS=$VITE_MOCK_LATENCY_MS \
    VITE_MOCK_FAILURE_RATE=$VITE_MOCK_FAILURE_RATE

RUN pnpm --filter @ptc-bale/dashboard-web build

FROM nginx:1.27.3-alpine AS runtime
LABEL org.opencontainers.image.title="PTC Bale Inspection Dashboard" \
      org.opencontainers.image.description="Isolated frontend runtime for the PTC Bale Inspection Monitoring PoC"

RUN rm -f /etc/nginx/conf.d/default.conf
COPY apps/dashboard-web/deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/dashboard-web/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
