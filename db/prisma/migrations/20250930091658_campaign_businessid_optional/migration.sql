/*
  Warnings:

  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DeliveryReceipt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MessagePayload` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OutboundMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Provider` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProviderRequestLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."Database" AS ENUM ('MESSAGING', 'USER', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "public"."CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."ExecutionStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'STOPPED');

-- CreateEnum
CREATE TYPE "public"."ScheduleType" AS ENUM ('ONE_TIME', 'RECURRING', 'EVENT_TRIGGERED');

-- CreateEnum
CREATE TYPE "public"."TargetOperator" AS ENUM ('EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'IN', 'NOT_IN', 'CONTAINS', 'NOT_CONTAINS', 'BEFORE', 'AFTER');

-- CreateEnum
CREATE TYPE "public"."StepRecipientStatus" AS ENUM ('PENDING', 'SCHEDULED', 'ENQUEUED', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED', 'TIMED_OUT', 'RETRYING');

-- DropForeignKey
ALTER TABLE "public"."DeliveryReceipt" DROP CONSTRAINT "DeliveryReceipt_outboundMessageId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OutboundMessage" DROP CONSTRAINT "OutboundMessage_payloadId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OutboundMessage" DROP CONSTRAINT "OutboundMessage_providerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProviderRequestLog" DROP CONSTRAINT "ProviderRequestLog_outboundMessageId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProviderRequestLog" DROP CONSTRAINT "ProviderRequestLog_providerId_fkey";

-- DropTable
DROP TABLE "public"."AuditLog";

-- DropTable
DROP TABLE "public"."DeliveryReceipt";

-- DropTable
DROP TABLE "public"."MessagePayload";

-- DropTable
DROP TABLE "public"."OutboundMessage";

-- DropTable
DROP TABLE "public"."Provider";

-- DropTable
DROP TABLE "public"."ProviderRequestLog";

-- DropEnum
DROP TYPE "public"."MessageStatus";

-- CreateTable
CREATE TABLE "public"."Campaign" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "brandId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduleType" "public"."ScheduleType" NOT NULL,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "recurrenceRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CampaignStep" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" "public"."Channel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TargetingRule" (
    "id" TEXT NOT NULL,
    "campaignStepId" TEXT NOT NULL,
    "database" "public"."Database" NOT NULL,
    "field" TEXT NOT NULL,
    "operator" "public"."TargetOperator" NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TargetingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StepTemplate" (
    "id" TEXT NOT NULL,
    "campaignStepId" TEXT NOT NULL,
    "channel" "public"."Channel" NOT NULL,
    "subject" TEXT,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CampaignExecution" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."ExecutionStatus" NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StepExecution" (
    "id" TEXT NOT NULL,
    "campaignExecutionId" TEXT,
    "campaignStepId" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."ExecutionStatus" NOT NULL,
    "totalTargets" INTEGER,
    "sentMessages" INTEGER,
    "errors" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StepExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StepRecipient" (
    "id" TEXT NOT NULL,
    "stepExecutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."StepRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "enqueuedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "externalMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CampaignAuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT,
    "action" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "targetId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OutboxEvent" (
    "id" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "traceId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "maxAttempts" INTEGER NOT NULL DEFAULT 10,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignStep_campaignId_stepOrder_key" ON "public"."CampaignStep"("campaignId", "stepOrder");

-- CreateIndex
CREATE UNIQUE INDEX "StepTemplate_campaignStepId_key" ON "public"."StepTemplate"("campaignStepId");

-- CreateIndex
CREATE INDEX "StepRecipient_userId_status_idx" ON "public"."StepRecipient"("userId", "status");

-- CreateIndex
CREATE INDEX "StepRecipient_stepExecutionId_status_idx" ON "public"."StepRecipient"("stepExecutionId", "status");

-- CreateIndex
CREATE INDEX "StepRecipient_externalMessageId_idx" ON "public"."StepRecipient"("externalMessageId");

-- CreateIndex
CREATE INDEX "OutboxEvent_publishedAt_idx" ON "public"."OutboxEvent"("publishedAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_type_idx" ON "public"."OutboxEvent"("type");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON "public"."OutboxEvent"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "OutboxEvent_nextAttemptAt_idx" ON "public"."OutboxEvent"("nextAttemptAt");

-- AddForeignKey
ALTER TABLE "public"."CampaignStep" ADD CONSTRAINT "CampaignStep_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TargetingRule" ADD CONSTRAINT "TargetingRule_campaignStepId_fkey" FOREIGN KEY ("campaignStepId") REFERENCES "public"."CampaignStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StepTemplate" ADD CONSTRAINT "StepTemplate_campaignStepId_fkey" FOREIGN KEY ("campaignStepId") REFERENCES "public"."CampaignStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignExecution" ADD CONSTRAINT "CampaignExecution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StepExecution" ADD CONSTRAINT "StepExecution_campaignExecutionId_fkey" FOREIGN KEY ("campaignExecutionId") REFERENCES "public"."CampaignExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StepExecution" ADD CONSTRAINT "StepExecution_campaignStepId_fkey" FOREIGN KEY ("campaignStepId") REFERENCES "public"."CampaignStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StepRecipient" ADD CONSTRAINT "StepRecipient_stepExecutionId_fkey" FOREIGN KEY ("stepExecutionId") REFERENCES "public"."StepExecution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignAuditLog" ADD CONSTRAINT "CampaignAuditLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
