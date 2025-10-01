###############################################
# Build stage
###############################################
FROM node:20-alpine AS build
WORKDIR /app

# Copy manifests first (better layer caching, include lockfile)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY .npmrc .npmrc
COPY types/package.json types/package.json
COPY db/package.json db/package.json
COPY server/package.json server/package.json

# Copy sources (only necessary packages)
COPY types ./types
COPY db ./db
COPY server ./server

ARG GITHUB_PACKAGES_TOKEN
ENV CI=true \
    GITHUB_PACKAGES_TOKEN=${GITHUB_PACKAGES_TOKEN}
RUN corepack enable && \
	(pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile)

# Generate Prisma client (if not already via lifecycle scripts) & build packages
RUN pnpm --filter @campaign-service/db exec prisma generate || true
RUN pnpm --filter @campaign-service/db build && \
	pnpm --filter @campaign-service/server build

# Remove devDependencies across workspace to shrink runtime footprint
# Prune dev deps across workspace; fallback if prune aborts due to non-interactive TTY edge
RUN pnpm prune --prod || pnpm install --prod --no-optional --frozen-lockfile

###############################################
# Runtime stage (minimal)
###############################################
FROM node:20-alpine
ENV NODE_ENV=production \
	# Optionally cap old space (adjust as needed; remove if app OOMs)
	NODE_OPTIONS="--max_old_space_size=512"
WORKDIR /app

# Copy pruned node_modules and required runtime artifacts
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/tsconfig.base.json ./
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/db/package.json ./db/package.json
COPY --from=build /app/db/dist ./db/dist

# (Types package not required at runtime; omit to save space)

USER node
CMD ["node", "server/dist/src/app.js"]