import { prisma } from './prismaClient.js';
import type { Campaign, CampaignStep, ExecutionStatus, Prisma } from "@prisma/client";
import type { 
	CreateCampaign, 
	CreateCampaignStep, 
	CreateTargetingRule,
	CreateStepRecipient, 
	UpdateCampaign,
	UpdateCampaignStep,
	UpdateStepTemplate,
	ManageCampaign,
	UpdateStepExecution
} from "@campaign-service/types";


export class RepositoryPrisma {
	async healthCheck() {
		// simple lightweight query; if it throws, caller handles error
		await prisma.$queryRaw`SELECT 1`;
		return { db: true };
	}
	
	async findDueActiveCampaigns(now: Date): Promise<{ id: string }[]> {
		return prisma.campaign.findMany({
			where: {
				status: 'ACTIVE',
				AND: [
					{ OR: [{ startAt: null }, { startAt: { lte: now } }] },
					{ OR: [{ endAt: null }, { endAt: { gte: now } }] },
				],
			},
			select: { id: true },
		});
	}

	async findCampaignById(id: string, scopes: string[]): Promise<(Campaign & { steps: CampaignStep[] }) | null> {
		return prisma.campaign.findUnique({
			where: { 
				id: id,
				OR: [
					{ businessId: { in: scopes || [] } },
					{ brandId: { in: scopes || [] } }
				],
			},
			include: { 
				steps: {
					include: {
						template: true,
						targetingRules: true,
					}
				}
			},
		});
	}


	async findCampaignsByBusinessId(businessId: string): Promise<Campaign[]> {
		return prisma.campaign.findMany({
			where: { businessId },
			orderBy: [ { createdAt: 'asc' }, { id: 'asc' } ]
		});
	}

	async findCampaignsByBrandId(brandId: string): Promise<Campaign[]> {
		return prisma.campaign.findMany({
			where: { brandId },
			orderBy: [ { createdAt: 'asc' }, { id: 'asc' } ]
		});
	}

	async countActiveCampaignsByBusinessIds(businessIds: string[]): Promise<Record<string, number>> {
		const results = await prisma.campaign.groupBy({
			by: ['businessId'],
			where: {
				businessId: { in: businessIds },
				status: 'ACTIVE'
			},
			_count: {
				id: true
			}
		});

		const counts: Record<string, number> = {};
		for (const businessId of businessIds) {
			counts[businessId] = 0;
		}
		for (const result of results) {
			if (result.businessId) {
				counts[result.businessId] = result._count.id;
			}
		}
		return counts;
	}

	async createCampaign(data: CreateCampaign) {
		return prisma.campaign.create({
			data: {
				businessId: data.businessId ? data.businessId : null,
				brandId: data.brandId ? data.brandId : null,
				name: data.name,
				description: data.description ? data.description : null,
				status: 'DRAFT',
				scheduleType: data.scheduleType,
				recurrenceRule: data.recurrenceRule,
				startAt: null,
				endAt: null,
				steps: {
					create: data.steps.map((step: CreateCampaignStep) => {
						const stepData: any = {
							stepOrder: step.stepOrder,
							name: step.name,
							description: step.description,
							channel: step.channel,
						};
						if ((step as any).prize?.id) {
							stepData.prizeId = (step as any).prize.id;
						}
						if (step.template) {
							stepData.template = {
								create: {
									channel: step.template.channel,
									subject: step.template.subject,
									bodyText: step.template.bodyText,
									bodyHtml: step.template.bodyHtml ? step.template.bodyHtml : null,
								}
							};
						}
						if (step.targetingRules && step.targetingRules.length) {
							stepData.targetingRules = {
								create: step.targetingRules.map((rule: CreateTargetingRule) => ({
									database: rule.database,
									field: rule.field,
									operator: rule.operator,
									value: rule.value as any,
								}))
							};
						}
						return stepData;
					})
				}
			}
		});
	}

	async updateCampaign(id: string, scopes: string[], data: UpdateCampaign) {
		const updateData: Record<string, any> = {};

		if ('name' in data) updateData.name = data.name;
		if ('description' in data) updateData.description = data.description ?? null;
		if ('businessId' in data) updateData.businessId = data.businessId ?? null;
		if ('brandId' in data) updateData.brandId = data.brandId ?? null;
		if ('status' in data) updateData.status = data.status;
		if ('scheduleType' in data) updateData.scheduleType = data.scheduleType;
		if ('recurrenceRule' in data) updateData.recurrenceRule = data.recurrenceRule ?? null;
		if ('startAt' in data) updateData.startAt = data.startAt ? new Date(data.startAt) : null;
		if ('endAt' in data) updateData.endAt = data.endAt ? new Date(data.endAt) : null;

		if (Object.keys(updateData).length === 0) {
			return prisma.campaign.findUnique({ where: { id } }) as unknown as Campaign;
		}

		return prisma.campaign.update({
			where: { 
				id: id,
				OR: [
					{ businessId: { in: scopes || [] } },
					{ brandId: { in: scopes || [] } }
				],
			},
			data: updateData,
		});
	}

	async deleteCampaign(id: string, businessIds: string[]) {
		const existing = await this.findCampaignById(id, businessIds);
		if (!existing)
			throw new Error('Campaign not found');
		// Cascade deletes for steps/template/targetingRules handled by Prisma referential actions if configured; otherwise explicit deletes.
		return prisma.campaign.delete({
			where: { id: id },
		});
	}

	async manageCampaign(id: string, businessIds: string[], data: ManageCampaign) {
		const campaign = await this.findCampaignById(id, businessIds);
		if (!campaign) 
			throw new Error("Campaign not found");

		switch (data.action) {
			case "start":
				return (data.payload ? this.startCampaign(campaign, data.payload.endAt) : this.startCampaign(campaign));
			case "stop":
				return this.stopCampaign(campaign);
			case "pause":
				return this.pauseCampaign(campaign);
			case "resume":
				return this.resumeCampaign(campaign);
			case "reschedule":
				return (data.payload ? this.rescheduleCampaign(campaign, data.payload) : this.rescheduleCampaign(campaign));
		}
	}

	private async startCampaign(campaign: Campaign & { steps: CampaignStep[] }, endAt?: string) {
		if (endAt) {
			campaign.endAt = new Date(endAt);
		}
		campaign.status = "ACTIVE";
		return prisma.campaign.update({
			where: { id: campaign.id },
			data: { status: campaign.status, endAt: campaign.endAt },
		});
	}

	private async stopCampaign(campaign: Campaign & { steps: CampaignStep[] }) {
		campaign.status = "COMPLETED";
		return prisma.campaign.update({
			where: { id: campaign.id },
			data: { status: campaign.status },
		});
	}

	private async pauseCampaign(campaign: Campaign & { steps: CampaignStep[] }) {
		campaign.status = "PAUSED";
		return prisma.campaign.update({
			where: { id: campaign.id },
			data: { status: campaign.status },
		});
	}

	private async resumeCampaign(campaign: Campaign & { steps: CampaignStep[] }) {
		campaign.status = "ACTIVE";
		return prisma.campaign.update({
			where: { id: campaign.id },
			data: { status: campaign.status },
		});
	}

	private async rescheduleCampaign(campaign: Campaign & { steps: CampaignStep[] }, payload?: { startAt?: string | undefined; endAt?: string | undefined }) {
		if (payload?.startAt) {
			campaign.startAt = new Date(payload.startAt);
		}
		if (payload?.endAt) {
			campaign.endAt = new Date(payload.endAt);
		}
		return prisma.campaign.update({
			where: { id: campaign.id },
			data: { startAt: campaign.startAt, endAt: campaign.endAt },
		});
	}

	// Steps
	async findCampaignSteps(campaignId: string, scopes: string[]) {
		const campaign = await prisma.campaign.findFirst({
			where: {
				id: campaignId,
				OR: [
					{ businessId: { in: scopes || [] } },
					{ brandId: { in: scopes || [] } }
				],
			},
			include: {
				steps: {
					include: {
						template: true,
						targetingRules: true,
					},
					orderBy: { stepOrder: 'asc' }
				}
			}
		});
		if (!campaign) return [];
		return campaign.steps;
	}

	async createCampaignStep(campaignId: string, scopes: string[], data: CreateCampaignStep) {
		// Ensure campaign exists and belongs to user/business context
		const campaign = await prisma.campaign.findFirst({
			where: { 
				id: campaignId, 
				OR: [
					{ businessId: { in: scopes || [] } },
					{ brandId: { in: scopes || [] } }
				], 
			},
			select: { id: true }
		});
		if (!campaign) throw new Error('Campaign not found');

		const stepData: any = {
			campaignId: campaignId,
			stepOrder: data.stepOrder,
			name: data.name,
			description: data.description,
			channel: data.channel,
		};
		if (data.template) {
			stepData.template = {
				create: {
					channel: data.template.channel,
					subject: data.template.subject,
					bodyText: data.template.bodyText,
					bodyHtml: data.template.bodyHtml ? data.template.bodyHtml : null,
				}
			};
		}
		if (data.targetingRules && data.targetingRules.length) {
			stepData.targetingRules = {
				create: data.targetingRules.map((rule: CreateTargetingRule) => ({
					database: rule.database,
					field: rule.field,
					operator: rule.operator,
					value: rule.value as any,
				}))
			};
		}
		return prisma.campaignStep.create({
			data: stepData,
			include: { template: true, targetingRules: true }
		});
	}

	async findCampaignStepById(campaignId: string, stepId: string, scopes: string[]) {
		return prisma.campaignStep.findFirst({
			where: {
				id: stepId,
				campaignId: campaignId,
				campaign: { 
					OR: [
						{ businessId: { in: scopes || [] } },
						{ brandId: { in: scopes || [] } }
					], 
				}
			},
			include: {
				template: true,
				targetingRules: true,
			}
		});
	}

	async updateCampaignStep(campaignId: string, stepId: string, businessIds: string[], data: UpdateCampaignStep) {
		const existing = await this.findCampaignStepById(campaignId, stepId, businessIds);
		if (!existing) throw new Error('Campaign step not found');

		const updateData: Record<string, any> = {};
		if ('stepOrder' in data) updateData.stepOrder = data.stepOrder;
		if ('name' in data) updateData.name = data.name;
		if ('description' in data) updateData.description = data.description ?? null;
		if ('channel' in data) updateData.channel = data.channel;
		if ((data as any).prize?.id !== undefined) updateData.prizeId = (data as any).prize ? (data as any).prize.id : null;

		if (Object.keys(updateData).length === 0) {
			return existing; // nothing to update
		}

		return prisma.campaignStep.update({
			where: { id: stepId },
			data: updateData,
			include: { template: true, targetingRules: true }
		});
	}

	async deleteCampaignStep(campaignId: string, stepId: string, businessIds: string[]) {
		const existing = await this.findCampaignStepById(campaignId, stepId, businessIds);
		if (!existing) throw new Error('Campaign step not found');
		// Cascade deletes for template/targetingRules handled by Prisma referential actions if configured; otherwise explicit deletes.
		return prisma.campaignStep.delete({ where: { id: stepId } });
	}

	// Executions
	async findLatestCampaignExecution(campaignId: string, statuses?: ExecutionStatus[]) {
		return prisma.campaignExecution.findFirst({
			where: { campaignId, ...(statuses && statuses.length ? { status: { in: statuses } } : {}) },
			orderBy: { runAt: 'desc' }
		});
	}
	async findCampaignExecutions(campaignId: string, scopes: string[], page: number, pageSize: number) {
		const campaign = await prisma.campaign.findFirst({
			where: { 
				id: campaignId, 
				OR: [
					{ businessId: { in: scopes || [] } },
					{ brandId: { in: scopes || [] } }
				], 
			},
			select: { id: true }
		});
		if (!campaign) throw new Error('Campaign not found');

		const skip = (page - 1) * pageSize;
		const [total, items] = await prisma.$transaction([
			prisma.campaignExecution.count({ where: { campaignId } }),
			prisma.campaignExecution.findMany({
				where: { campaignId },
				orderBy: { runAt: 'desc' },
				skip,
				take: pageSize,
			})
		]);

		const totalPages = Math.max(1, Math.ceil(total / pageSize));
		return {
			items,
			page,
			pageSize,
			total,
			totalPages,
			hasNext: page < totalPages,
			hasPrev: page > 1,
		};
	}

	async findCampaignExecutionById(campaignId: string, executionId: string, scopes: string[]) {
		return prisma.campaignExecution.findFirst({
			where: {
				id: executionId,
				campaignId: campaignId,
				campaign: { 
					OR: [
						{ businessId: { in: scopes || [] } },
						{ brandId: { in: scopes || [] } }
					], 
				}
			},
			include: { stepExecutions: true }
		});
	}

	async createCampaignExecution(campaignId: string) {
		return prisma.campaignExecution.create({
			data: {
				campaignId: campaignId,
				status: 'RUNNING',
				runAt: new Date(),
			}
		});
	}

	/**
	 * Update a campaign execution status (helper for scheduler). If errorMessage key is present it will be set (or cleared when null).
	 */
	async updateCampaignExecution(executionId: string, data: { status: ExecutionStatus; errorMessage?: string | null }) {
		const updateData: Record<string, any> = { status: data.status };
		if ('errorMessage' in data) updateData.errorMessage = data.errorMessage ?? null;
		return prisma.campaignExecution.update({
			where: { id: executionId },
			data: updateData,
		});
	}

	async manageCampaignExecution(campaignId: string, executionId: string, scopes: string[], data: { action: 'retry' | 'stop' }) {
		const campaign = await prisma.campaign.findFirst({
			where: { 
				id: campaignId, 
				OR: [
					{ businessId: { in: scopes || [] } },
					{ brandId: { in: scopes || [] } }
				], 
			},
			select: { id: true }
		});
		if (!campaign) throw new Error('Campaign not found');

		const existing = await prisma.campaignExecution.findUnique({ where: { id: executionId } });
		if (!existing) 
			throw new Error('Execution not found');

		switch (data.action) {
			case 'retry': {
				if (existing && existing.status === 'RUNNING') 
					return existing; // idempotent start
				return this.retryCampaignExecution(executionId);
			}
			case 'stop': {
				if (existing && existing.status !== 'RUNNING') 
					return existing;
				return this.stopCampaignExecution(executionId);
			}
			default:
				throw new Error('Unsupported execution action');
		}
	}

	private async retryCampaignExecution(executionId: string) {
		return prisma.campaignExecution.update({
			where: { id: executionId },
			data: { status: 'RUNNING' }
		});
	}

	private async stopCampaignExecution(executionId: string) {
		return prisma.campaignExecution.update({
			where: { id: executionId },
			data: { status: 'STOPPED', errorMessage: null }
		});
	}

	// Step executions
	async findStepExecutions(campaignId: string, stepId: string, scopes: string[], page: number, pageSize: number) {
		// ownership via step relation
		const step = await prisma.campaignStep.findFirst({
			where: { 
				id: stepId, 
				campaignId, 
				campaign: { 
					OR: [
						{ businessId: { in: scopes || [] } },
						{ brandId: { in: scopes || [] } }
					], 
				}
			},
			select: { id: true }
		});
		if (!step) throw new Error('Campaign step not found');

		const skip = (page - 1) * pageSize;
		const [total, items] = await prisma.$transaction([
			prisma.stepExecution.count({ where: { campaignStepId: stepId } }),
			prisma.stepExecution.findMany({
				where: { campaignStepId: stepId },
				orderBy: { runAt: 'desc' },
				skip,
				take: pageSize,
			})
		]);
		const totalPages = Math.max(1, Math.ceil(total / pageSize));
		return { items, page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
	}

	async findStepExecutionById(campaignId: string, stepId: string, executionId: string, scopes: string[]) {
		return prisma.stepExecution.findFirst({
			where: {
				id: executionId,
				campaignStepId: stepId,
				campaignStep: { 
					campaignId, 
					campaign: { 
						OR: [
							{ businessId: { in: scopes || [] } },
							{ brandId: { in: scopes || [] } }
						], 
					}
				}
			}
		});
	}

	async createStepExecution(campaignExecutionId: string, campaignStepId: string) {
		return prisma.stepExecution.create({
			data: {
				campaignExecutionId,
				campaignStepId,
				status: 'RUNNING',
				runAt: new Date(),
			}
		});
	}

	async findStepExecutionRecipients(campaignId: string, stepId: string, executionId: string, scopes: string[], page: number, pageSize: number) {
		// verify ownership via stepExecution -> step -> campaign
		const stepExecution = await prisma.stepExecution.findFirst({
			where: {
				id: executionId,
				campaignStepId: stepId,
				campaignStep: { 
					campaignId, 
					campaign: { 
						OR: [
							{ businessId: { in: scopes || [] } },
							{ brandId: { in: scopes || [] } }
						], 
					}
				}
			},
			select: { id: true }
		});
		if (!stepExecution) throw new Error('Step execution not found');

		const skip = (page - 1) * pageSize;
		const [total, items] = await prisma.$transaction([
			prisma.stepRecipient.count({ where: { stepExecutionId: executionId } }),
			prisma.stepRecipient.findMany({
				where: { stepExecutionId: executionId },
				orderBy: { createdAt: 'desc' },
				skip,
				take: pageSize,
			})
		]);
		const totalPages = Math.max(1, Math.ceil(total / pageSize));
		return { items, page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
	}

	async findStepExecutionRecipientById(executionId: string, recipientId: string) {
		return prisma.stepRecipient.findFirst({
			where: {
				id: recipientId,
				stepExecutionId: executionId,
			}
		});
	}

	/**
	 * Backwards compatibility alias used by scheduler code originally.
	 */
	async findStepExecutionRecipient(executionId: string, recipientId: string) {
		return this.findStepExecutionRecipientById(executionId, recipientId);
	}

	async createStepExecutionRecipient(campaignId: string, stepId: string, executionId: string, recipient: CreateStepRecipient) {
		// verify ownership via stepExecution -> step -> campaign
		const stepExecution = await prisma.stepExecution.findFirst({
			where: {
				id: executionId,
				campaignStepId: stepId,
				campaignStep: { campaignId }
			},
			select: { id: true }
		});
		if (!stepExecution) throw new Error('Step execution not found');

		return prisma.stepRecipient.create({
			data: {
				stepExecutionId: stepExecution.id,
				userId: recipient.userId,
				status: recipient.status,
				enqueuedAt: recipient.enqueuedAt ? new Date(recipient.enqueuedAt) : null,
				sentAt: recipient.sentAt ? new Date(recipient.sentAt) : null,
				deliveredAt: recipient.deliveredAt ? new Date(recipient.deliveredAt) : null,
				attempts: typeof recipient.attempts === 'number' ? recipient.attempts : 0,
				externalMessageId: recipient.externalMessageId ?? null,
			}
		});
	}

	async updateStepExecutionRecipient(executionId: string, recipientId: string, data: Partial<CreateStepRecipient>) {
		const existing = await this.findStepExecutionRecipientById(executionId, recipientId);
		if (!existing) throw new Error('Step execution recipient not found');

		const updateData: Record<string, any> = {};
		if ('status' in data) updateData.status = data.status;
		if ('enqueuedAt' in data) updateData.enqueuedAt = data.enqueuedAt ? new Date(data.enqueuedAt) : null;
		if ('sentAt' in data) updateData.sentAt = data.sentAt ? new Date(data.sentAt) : null;
		if ('deliveredAt' in data) updateData.deliveredAt = data.deliveredAt ? new Date(data.deliveredAt) : null;
		if ('attempts' in data) updateData.attempts = data.attempts;
		if ('externalMessageId' in data) updateData.externalMessageId = data.externalMessageId ?? null;

		if (Object.keys(updateData).length === 0) {
			return existing; // nothing to update
		}

		return prisma.stepRecipient.update({
			where: { id: recipientId },
			data: updateData,
		});
	}

	async updateStepExecution(stepExecutionId: string, data: UpdateStepExecution) {
		// Fetch existing first so we can return it unchanged if no real updates passed
		const existing = await prisma.stepExecution.findUnique({ where: { id: stepExecutionId } });
		if (!existing) return undefined;

		const updateData: Record<string, any> = {};
		if ('status' in data && typeof data.status !== 'undefined') updateData.status = data.status;
		if ('errorMessage' in data) updateData.errorMessage = data.errorMessage ?? null;

		if (Object.keys(updateData).length === 0) {
			return existing; // nothing to update
		}

		return prisma.stepExecution.update({
			where: { id: stepExecutionId },
			data: updateData,
		});
	}

	// Step template (assuming one current template but model supports multiple)
	async findStepTemplate(campaignId: string, stepId: string, businessIds: string[]) {
		const step = await this.findCampaignStepById(campaignId, stepId, businessIds);
		if (!step) throw new Error('Campaign step not found');
		return step.template;
	}

	async updateStepTemplate(campaignId: string, stepId: string, businessIds: string[], template: UpdateStepTemplate) {
		const step = await this.findCampaignStepById(campaignId, stepId, businessIds);
		if (!step) throw new Error('Campaign step not found');

		const updateData: Record<string, any> = {};
		if ('channel' in template) updateData.channel = template.channel;
		if ('subject' in template) updateData.subject = template.subject;
		if ('bodyText' in template) updateData.bodyText = template.bodyText;
		if ('bodyHtml' in template) updateData.bodyHtml = template.bodyHtml ?? null;

		if (Object.keys(updateData).length === 0) {
			return step.template;
		}

		if (!step.template) throw new Error('Template not found');
		return prisma.stepTemplate.update({
			where: { id: step.template.id },
			data: updateData,
		});
	}

	// Outbox
	async createOutboxEvent(evt: { aggregateType: string; aggregateId: string; type: string; version: number; payload: any; traceId?: string; maxAttempts?: number }) {
		return prisma.outboxEvent.create({
			data: {
				aggregateType: evt.aggregateType,
				aggregateId: evt.aggregateId,
				type: evt.type,
				version: evt.version,
				payload: evt.payload as any,
				traceId: evt.traceId ?? null,
				maxAttempts: evt.maxAttempts ?? 10,
				nextAttemptAt: new Date(),
			}
		});
	}

	async fetchUnpublishedOutboxEvents(limit: number = 100, now: Date = new Date()) {
		return prisma.outboxEvent.findMany({
			where: { publishedAt: null, nextAttemptAt: { lte: now } },
			orderBy: { occurredAt: 'asc' },
			take: limit
		});
	}

	async markOutboxEventPublished(id: string) {
		return prisma.outboxEvent.update({ where: { id }, data: { publishedAt: new Date(), error: null } });
	}

	async markOutboxEventFailed(id: string, error: string, backoffSeconds: number) {
		return prisma.outboxEvent.update({
			where: { id },
			data: { attempt: { increment: 1 }, error, nextAttemptAt: new Date(Date.now() + backoffSeconds * 1000) }
		});
	}

	async markOutboxEventGiveUp(id: string, error: string) {
		return prisma.outboxEvent.update({ where: { id }, data: { error, nextAttemptAt: new Date(8640000000000000) } });
	}
}