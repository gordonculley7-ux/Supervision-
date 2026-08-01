# Build & run the Web edition (apps/web) from the monorepo for Railway.
FROM node:22-slim AS base
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY packages/core/package.json packages/core/
COPY apps/web/package.json apps/web/
RUN npm install --workspaces --include-workspace-root --ignore-scripts --no-audit --no-fund

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm --workspace @supervision-tracker/web run build

FROM base AS run
ENV NODE_ENV=production
ENV PORT=3000
# Next standalone server (monorepo layout: apps/web/server.js + bundled node_modules)
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
# Prisma schema + CLI + generated client/engines so we can run migrations at startup
COPY --from=build /app/apps/web/prisma ./apps/web/prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["sh","-c","node node_modules/prisma/build/index.js db push --schema apps/web/prisma/schema.prisma --skip-generate --accept-data-loss && node apps/web/server.js"]
