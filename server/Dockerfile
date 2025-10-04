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
RUN pnpm --filter @campaign-service/types build && \
    pnpm --filter @campaign-service/db build && \
	pnpm --filter @campaign-service/server build

# Install only production dependencies for the server package explicitly so its node_modules
# directory contains proper symlinks to required packages. Then remove the rest of the workspace
# node_modules to minimize size while still keeping built artifacts.
RUN pnpm --filter @campaign-service/types install --prod --no-optional --frozen-lockfile && \
	pnpm --filter @campaign-service/db install --prod --no-optional --frozen-lockfile && \
	pnpm --filter @campaign-service/server install --prod --no-optional --frozen-lockfile && \
	rm -rf node_modules/.pnpm/*vitest* node_modules/.pnpm/typescript@* || true

###############################################
# Runtime stage (minimal)
###############################################
FROM node:20-alpine
ENV NODE_ENV=production \
	# Optionally cap old space (adjust as needed; remove if app OOMs)
	NODE_OPTIONS="--max_old_space_size=512"
WORKDIR /app

# Copy only the server's node_modules (pnpm creates a single node_modules; keep entire tree for safety)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/tsconfig.base.json ./
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/types/package.json ./types/package.json
COPY --from=build /app/types/dist ./types/dist
COPY --from=build /app/types/node_modules ./types/node_modules
COPY --from=build /app/db/package.json ./db/package.json
COPY --from=build /app/db/dist ./db/dist
COPY --from=build /app/db/node_modules ./db/node_modules

# (Types package not required at runtime; omit to save space)

USER node
CMD ["node", "server/dist/src/app.js"]