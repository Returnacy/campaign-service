import { Queue } from 'bullmq';

const QUEUE_MAX_ATTEMPTS = 3;
const QUEUE_BACKOFF_DELAY_MS = 2000;

export function createQueue(name: string, connection: any) {
	return new Queue(name, {
		connection,
		defaultJobOptions: {
			attempts: Number((globalThis as any).process?.env?.CAMPAIGN_QUEUE_MAX_ATTEMPTS || QUEUE_MAX_ATTEMPTS),
			backoff: { type: 'exponential', delay: Number((globalThis as any).process?.env?.CAMPAIGN_QUEUE_BACKOFF_MS || QUEUE_BACKOFF_DELAY_MS) },
			removeOnComplete: 500,
			removeOnFail: 2000,
		}
	});
}
