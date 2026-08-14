# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14-slim AS dependencies
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3.14-slim AS build-web
WORKDIR /app
ENV NODE_ENV=production

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile

COPY apps/web apps/web
RUN bun run --cwd apps/web build

FROM nginx:1.27-alpine AS web
COPY --from=build-web /app/apps/web/build /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

FROM oven/bun:1.3.14-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api/package.json apps/api/package.json
COPY apps/api/src apps/api/src

USER bun
EXPOSE 3000

CMD ["bun", "run", "--cwd", "apps/api", "start"]
