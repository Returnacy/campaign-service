import type { FastifyRequest } from "fastify";
import type { MembershipScope } from '../../../../types/membershipScope.js';

type QuickCreateBody = {
  type: "campaign" | "broadcast";
  channel: "email" | "sms" | "both";
  prize: "sconto_15" | "pizza_gratis" | "bevanda_gratis" | "nessuno";
  messageText: string;
  businessId?: string | null;
  brandId?: string | null;
  targetingType?: "birthday" | "lastVisit" | "stamps";
  birthdayOption?: "7_days_before" | "today";
  lastVisitOption?: "30_days" | "40_days";
  stampsOption?: "25" | "50" | "100";
};

export async function postQuickCreateService(request: FastifyRequest, scopes: MembershipScope[]) {
  const { repository } = request.server;
  const body = request.body as QuickCreateBody;

  if (!body.messageText || !body.messageText.trim()) {
    return { statusCode: 400, body: { error: "Message text is required" } };
  }

  // Use businessId/brandId from body if provided, otherwise use scopes
  let businessId = body.businessId || null;
  let brandId = body.brandId || null;

  if (!businessId && !brandId && scopes.length > 0) {
    const scope = scopes[0];
    businessId = scope.businessId || null;
    brandId = scope.brandId || null;
  }

  // Build campaign name
  let campaignName = body.type === "campaign" ? "Campagna " : "Broadcast ";
  if (body.type === "campaign" && body.targetingType) {
    const targetLabels = {
      birthday: "Compleanno",
      lastVisit: "Ultima Visita",
      stamps: "Timbri"
    };
    campaignName += targetLabels[body.targetingType];
  } else {
    campaignName += new Date().toLocaleDateString("it-IT");
  }

  // Build targeting rules if campaign
  const targetingRules: any[] = [];
  if (body.type === "campaign" && body.targetingType) {
    if (body.targetingType === "birthday") {
      if (body.birthdayOption === "7_days_before") {
        targetingRules.push({
          database: "USER",
          field: "birthday",
          operator: "EQUALS",
          value: { daysOffset: -7 }
        });
      } else if (body.birthdayOption === "today") {
        targetingRules.push({
          database: "USER",
          field: "birthday",
          operator: "EQUALS",
          value: { daysOffset: 0 }
        });
      }
    } else if (body.targetingType === "lastVisit") {
      if (body.lastVisitOption === "30_days") {
        targetingRules.push({
          database: "USER",
          field: "lastVisit",
          operator: "BEFORE",
          value: { daysAgo: 30 }
        });
      } else if (body.lastVisitOption === "40_days") {
        targetingRules.push({
          database: "USER",
          field: "lastVisit",
          operator: "BEFORE",
          value: { daysAgo: 40 }
        });
      }
    } else if (body.targetingType === "stamps") {
      let stampsThreshold = 25;
      if (body.stampsOption === "50") stampsThreshold = 50;
      else if (body.stampsOption === "100") stampsThreshold = 100;

      targetingRules.push({
        database: "USER",
        field: "stamps",
        operator: "GREATER_THAN",
        value: stampsThreshold
      });
    }
  }

  // Build steps based on channel
  const steps: any[] = [];
  const channels = body.channel === "both" ? ["email", "sms"] : [body.channel];

  for (const channel of channels) {
    const stepData: any = {
      stepOrder: steps.length + 1,
      name: channel === "email" ? "Invio Email" : "Invio SMS",
      description: `Step ${channel} per ${campaignName}`,
      channel: channel.toUpperCase() as "EMAIL" | "SMS",
      targetingRules: [...targetingRules],
      template: {
        channel: channel.toUpperCase() as "EMAIL" | "SMS",
        subject: channel === "email" ? campaignName : null,
        bodyText: body.messageText,
        bodyHtml: channel === "email" ? `<p>${body.messageText.replace(/\n/g, '<br>')}</p>` : null
      }
    };

    // Add SMS disclaimer if SMS
    if (channel === "sms") {
      stepData.template.bodyText += "\n\nScopri il tuo premio al link: https://pizzalonga.returnacy.app/me";
    }

    steps.push(stepData);
  }

  // Create campaign
  const campaignData: any = {
    businessId: businessId,
    brandId: brandId,
    name: campaignName,
    description: `Auto-generated ${body.type}`,
    scheduleType: body.type === "campaign" ? "EVENT_TRIGGERED" : "ONE_TIME",
    recurrenceRule: null,
    steps: steps
  };

  try {
    const campaign = await repository.createCampaign(campaignData);
    return { statusCode: 201, body: campaign };
  } catch (error: any) {
    request.log.error(error);
    return { statusCode: 500, body: { error: "Failed to create campaign" } };
  }
}
