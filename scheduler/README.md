# Campaign Dispatcher (batch runner)

Runs periodically (cron/CI) to:
- Find due active campaigns
- Query user-service for target users
- Render templates per user
- Schedule messages via messaging-service

Env vars required:
- USER_SERVICE_URL
- BUSINESS_SERVICE_URL (fallback if no mapping)
- MESSAGING_SERVICE_URL
- KEYCLOAK_TOKEN_URL
- KEYCLOAK_CLIENT_ID
- KEYCLOAK_CLIENT_SECRET
- DEFAULT_FROM (optional)

Optional URL mapping (multi-tenant discovery):
- DOMAIN_MAPPING_FILE: absolute path to a JSON file using the same format as user-service `domain-mapping.json`:

	Record<hostname, { brandId: string|null, businessId: string }>

	Example:

	{
		"localhost": { "brandId": "385d4ebb-4c4b-46e9-8701-0d71bfd7ce47", "businessId": "af941888-ec4c-458e-b905-21673241af3e" },
		"business.example.com": { "brandId": null, "businessId": "<uuid>" }
	}

	The scheduler will resolve the business base URL as:
	- `${BUSINESS_SERVICE_URL_SCHEME||https}://<hostname>` for the matching hostname.

- Legacy fallback (still supported):
	- BUSINESS_SERVICE_MAP_FILE pointing to a mapping of URL -> businessId, e.g. `{ "https://biz-a.example.com": "<uuid>" }`.

If no match is found for a given businessId the client falls back to BUSINESS_SERVICE_URL.

Note: default scheme for derived URLs is `https`. Override with `BUSINESS_SERVICE_URL_SCHEME=http` if needed for local/dev.

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