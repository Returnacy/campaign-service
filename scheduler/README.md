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
- DEFAULT_FROM (optional)

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