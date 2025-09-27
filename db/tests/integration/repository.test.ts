import { execSync } from 'child_process';
import { beforeAll, afterAll, beforeEach, afterEach, describe, test, expect } from 'vitest';
import { prisma } from '../../src/prismaClient.js';
import { RepositoryPrisma } from '../../src/repository.prisma.js';

describe('Campaign DB Repository Integration', () => {
	const MAX_RETRIES = 60;
	const RETRY_DELAY_MS = 1000;

	async function waitForDbReady(): Promise<void> {
		let attempts = 0;
		while (attempts < MAX_RETRIES) {
			try {
				// @ts-ignore
				await prisma.$queryRaw`SELECT 1`;
				return;
			} catch (err) {
				attempts += 1;
				// eslint-disable-next-line no-console
				console.log(`DB not ready yet (attempt ${attempts}/${MAX_RETRIES}) - retrying in ${RETRY_DELAY_MS}ms`);
				await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
			}
		}
		throw new Error('Timed out waiting for DB to become available');
	}

	async function cleanDb() {
		// Order matters due to FKs (children first)
		await prisma.campaignAuditLog.deleteMany({});
		await prisma.stepRecipient.deleteMany({});
		await prisma.stepExecution.deleteMany({});
		await prisma.campaignExecution.deleteMany({});
		await prisma.targetingRule.deleteMany({});
		await prisma.stepTemplate.deleteMany({});
		await prisma.campaignStep.deleteMany({});
		await prisma.campaign.deleteMany({});
	}

	beforeAll(async () => {
		if (!process.env.DATABASE_URL) {
			throw new Error('DATABASE_URL env var is required for integration tests');
		}
		await waitForDbReady();
		if (!process.env.SKIP_PRISMA_SETUP) {
			console.log('Running `npx prisma generate` ...');
			execSync('npx prisma generate', { stdio: 'inherit' });
			console.log('Running `npx prisma db push` to ensure schema exists ...');
			execSync('npx prisma db push', { stdio: 'inherit' });
		}
	});

	afterAll(async () => {
		await prisma.$disconnect();
	});

	beforeEach(async () => {
		await cleanDb();
	});

	afterEach(async () => {
		await cleanDb();
	});

	test('findDueActiveCampaigns returns active, in-window campaigns; templates/rules retrievable via steps', async () => {
		const now = new Date();

		// create ACTIVE campaign due now with one step that has one template + one targeting rule
		const camp = await prisma.campaign.create({
			data: {
				businessId: '11111111-1111-1111-1111-111111111111',
				brandId: null,
				name: 'Birthday Blast',
				description: 'Congrats!',
				status: 'ACTIVE',
				scheduleType: 'ONE_TIME',
				startAt: new Date(now.getTime() - 60_000),
				endAt: new Date(now.getTime() + 60_000),
				steps: {
					create: [{
						stepOrder: 1,
						name: 'initial',
						description: 'first step',
						channel: 'EMAIL',
						template: { create: { channel: 'EMAIL', subject: 'Happy Birthday, {{user.firstName}}!', bodyText: 'Have a great day! 🎉', bodyHtml: '<p>Have a great day!</p>' } },
						targetingRules: { create: [{ database: 'USER', field: 'birthDate', operator: 'EQUALS', value: 'today' as any }] }
					}]
				}
			},
			include: { steps: { include: { template: true, targetingRules: true } } },
		});

		const repo = new RepositoryPrisma();
		const due = await repo.findDueActiveCampaigns(now);
		expect(Array.isArray(due)).toBe(true);
		expect(due.length).toBeGreaterThanOrEqual(1);
		const found = due.find((c) => c.id === camp.id);
		expect(found).toBeTruthy();
		// fetch expanded campaign to assert related assets
		const expanded = await prisma.campaign.findUnique({
			where: { id: camp.id },
			include: { steps: { include: { template: true, targetingRules: true } } }
		});
		const templates = expanded!.steps.map((s: any) => s.template).filter(Boolean);
		const rules = expanded!.steps.flatMap((s: any) => s.targetingRules);
		expect(templates.length).toBe(1);
		expect(rules.length).toBe(1);
	});

	test('createCampaignExecution and manageCampaignExecution stop transition', async () => {
		const camp = await prisma.campaign.create({
			data: {
				businessId: '22222222-2222-2222-2222-222222222222',
				name: 'Churn 30',
				status: 'ACTIVE',
				scheduleType: 'ONE_TIME',
			}
		});
		const repo = new RepositoryPrisma();
		const exec = await repo.createCampaignExecution(camp.id);
		expect(exec.status).toBe('RUNNING');
		const stopped = await repo.manageCampaignExecution(camp.id, exec.id, [camp.businessId], { action: 'stop' });
		expect(stopped.status).toBe('STOPPED');
	});
});

