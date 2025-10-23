###############################################
# Build stage
###############################################
FROM node:20-alpine AS build
WORKDIR /app

# Copy manifests early (include lockfile for reproducible installs)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY .npmrc .npmrc
COPY types/package.json types/package.json
COPY db/package.json db/package.json
COPY scheduler/package.json scheduler/package.json

COPY types ./types
COPY db ./db
COPY scheduler ./scheduler

ARG GITHUB_PACKAGES_TOKEN
ARG FORCE_REINSTALL=0
ENV CI=true \
    GITHUB_PACKAGES_TOKEN=${GITHUB_PACKAGES_TOKEN} \
    FORCE_REINSTALL=${FORCE_REINSTALL}
RUN corepack enable && \
	echo "Force key: $FORCE_REINSTALL" && \
	(pnpm install -r --frozen-lockfile || pnpm install -r --no-frozen-lockfile)

RUN pnpm --filter @campaign-service/db exec prisma generate || true
RUN pnpm --filter @campaign-service/db build && \
	pnpm --filter @campaign-service/scheduler build

# Prune dev deps; fallback if prune aborts (rare)
# Install prod dependencies explicitly instead of prune (safer for now while debugging entrypoints)
# Keeping full node_modules (including dev deps) to avoid pruning workspace links needed at runtime.
# TODO: later optimize by using `pnpm deploy --filter @campaign-service/scheduler --prod`.

###############################################
# Runtime stage
###############################################
FROM node:20-alpine
ENV NODE_ENV=production \
	NODE_OPTIONS="--max_old_space_size=512"
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/tsconfig.base.json ./
COPY --from=build /app/scheduler/package.json ./scheduler/package.json
COPY --from=build /app/scheduler/dist ./scheduler/dist
COPY --from=build /app/scheduler/node_modules ./scheduler/node_modules
COPY --from=build /app/scheduler/business-service-map.json ./scheduler/business-service-map.json
COPY --from=build /app/db/package.json ./db/package.json
COPY --from=build /app/db/dist ./db/dist
COPY --from=build /app/db/node_modules ./db/node_modules
COPY --from=build /app/types/package.json ./types/package.json
COPY --from=build /app/types/dist ./types/dist
COPY --from=build /app/types/node_modules ./types/node_modules

USER node
CMD ["node", "scheduler/dist/src/app.js"]
