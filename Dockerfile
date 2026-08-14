# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14-slim AS dependencies
WORKDIR /app

# Keep the workspace manifests available so Bun can resolve the API package.
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile --production

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
