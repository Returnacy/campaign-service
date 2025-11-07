# Campaign Dispatcher (batch runner)

Runs periodically (cron/CI) to:
- Find due active campaigns
- Query user-service for target users
- Render templates per user
- Schedule messages via messaging-service

Env vars required:
- USER_SERVICE_URL
- MESSAGING_SERVICE_URL
- KEYCLOAK_TOKEN_URL
- KEYCLOAK_CLIENT_ID
- KEYCLOAK_CLIENT_SECRET
- DOMAIN_MAPPER_URL
- DEFAULT_FROM (optional)

Optional:
- BUSINESS_SERVICE_URL (used only if domain-mapper resolution fails)

Business URLs and ids are resolved at runtime from `domain-mapper-service`. Configure the mapper URL and ensure the service is reachable before starting the scheduler. The optional `BUSINESS_SERVICE_URL` acts only as a final fallback when the mapper cannot resolve a value.

Build and run (workspace):
- pnpm -r build
- pnpm --filter @campaign-service/scheduler start

Structure overview (modular, mirrors messaging dispatcher):
- src/dispatcher.ts: boots Redis, defines campaign.process queue and worker
- src/run/runner.ts: one-shot enqueuer that finds due campaigns and enqueues jobs
- src/services/campaignProcessor.ts: logic to list due campaigns and enqueue
- src/services/campaignJob.ts: processes a single campaign id (targeting, templating, schedule)
- src/clients/*: HTTP clients with retry and token auth
- src/utils/retry.ts: tiny retry with exponential backoff used by job

Testing:
- Unit tests cover dispatcher startup, runner orchestration, worker wrapper, and campaign job behavior.
- Run: pnpm --filter @campaign-service/scheduler test