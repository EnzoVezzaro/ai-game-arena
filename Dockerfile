# syntax=docker/dockerfile:1

# ---- Base stage ----
FROM oven/bun:1 AS base
WORKDIR /app

# ---- Install dependencies ----
FROM base AS deps
COPY package.json bun.lockb ./
COPY packages/*/package.json ./packages/
COPY plugins/*/package.json ./plugins/
COPY games/*/package.json ./games/
COPY apps/*/package.json ./apps/
RUN bun install --frozen-lockfile || bun install

# ---- Build ----
FROM deps AS build
COPY . .
RUN bun run build

# ---- Runtime ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/plugins ./plugins
COPY --from=build /app/games ./games
COPY --from=build /app/apps ./apps
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/bun.lockb ./bun.lockb

EXPOSE 3000
ENV PORT=3000
ENV DATA_DIR=/app/data

CMD ["bun", "run", "apps/server/src/index.ts"]
