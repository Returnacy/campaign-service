import { prisma } from './prismaClient.js';

// Disable seed by default unless explicitly allowed
if (process.env.ALLOW_SEED !== 'true') {
  console.log('[campaign-service][db] Seed disabled (set ALLOW_SEED=true to enable)');
  process.exit(0);
}

async function main() {
  // Minimal seed: create a brand and a business and an example draft campaign.
  // Note: The current schema doesn't define Brand/Business tables; Campaign holds optional brandId/businessId strings.
  // We'll use stable UUID-like strings for easy reference in tests.
  const brandId = '385d4ebb-4c4b-46e9-8701-0d71bfd7ce47';
  const businessId = 'af941888-ec4c-458e-b905-21673241af3e';

  // Idempotent seed: reuse existing campaign if present
  const existing = await prisma.campaign.findFirst({
    where: { businessId, name: 'Welcome Campaign' },
  });

  const campaign = existing ?? await prisma.campaign.create({
    data: {
      businessId,
      brandId: null,
      name: 'Welcome Campaign',
      description: 'Seeded draft campaign',
      status: 'ACTIVE',
      scheduleType: 'ONE_TIME',
      startAt: null,
      endAt: null,
    },
  });

  // Ensure at least one step exists with a template and a USER targeting rule
  const existingStep = await prisma.campaignStep.findFirst({ where: { campaignId: campaign.id } });
  if (!existingStep) {
    await prisma.campaignStep.create({
      data: {
        campaignId: campaign.id,
        stepOrder: 1,
        name: 'Welcome Email',
        description: 'Send a welcome email to users',
        channel: 'EMAIL',
        // optional prizeId omitted for seed
        template: {
          create: {
            channel: 'EMAIL',
            subject: 'Welcome to Returnacy',
            bodyText: 'Hello {{#if firstName}}{{firstName}}{{else}}there{{/if}}, welcome to Returnacy!'
          }
        },
        targetingRules: {
          create: [
            {
              database: 'USER',
              field: 'email',
              operator: 'CONTAINS',
              value: '@', // any email containing '@' will match
            } as any
          ]
        }
      }
    });
  } else {
    // Ensure the existing step has at least one broad USER rule matching emails
    const existingRule = await prisma.targetingRule.findFirst({ where: { campaignStepId: existingStep.id, database: 'USER' } });
    if (!existingRule) {
      await prisma.targetingRule.create({
        data: {
          campaignStepId: existingStep.id,
          database: 'USER',
          field: 'email',
          operator: 'CONTAINS',
          value: '@' as any,
        }
      });
    } else {
      // Normalize to CONTAINS '@'
      await prisma.targetingRule.update({
        where: { id: existingRule.id },
        data: { field: 'email', operator: 'CONTAINS', value: '@' as any }
      });
    }
  }

  // Output useful values for wiring env and memberships
  console.log('Seed complete');
  console.log('brandId:', brandId);
  console.log('businessId:', businessId);
  console.log('campaignId:', campaign.id);

  // Also seed a simple "Birthday Today" campaign so the scheduler can target a user with today's birthday
  // Build a MM-DD string for today (UTC) to match against YYYY-MM-DD stored birthdays using CONTAINS
  const today = new Date();
  const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(today.getUTCDate()).padStart(2, '0');
  const todaySuffix = `-${mm}-${dd}`; // e.g., -10-22

  const existingBirthday = await prisma.campaign.findFirst({
    where: { businessId, name: 'Birthday Today' },
  });
  const birthdayCampaign = existingBirthday ?? await prisma.campaign.create({
    data: {
      businessId,
      brandId: null,
      name: 'Birthday Today',
      description: 'Send a birthday email to users whose birthday is today',
      status: 'ACTIVE',
      // Run as ONE_TIME to allow one-shot verification; rerun is allowed via env in compose
      scheduleType: 'ONE_TIME',
      startAt: null,
      endAt: null,
    },
  });

  const existingBirthdayStep = await prisma.campaignStep.findFirst({ where: { campaignId: birthdayCampaign.id } });
  if (!existingBirthdayStep) {
    await prisma.campaignStep.create({
      data: {
        campaignId: birthdayCampaign.id,
        stepOrder: 1,
        name: 'Birthday Email',
        description: 'Wish happy birthday with a simple email',
        channel: 'EMAIL',
        template: {
          create: {
            channel: 'EMAIL',
            subject: 'Happy Birthday, {{#if firstName}}{{firstName}}{{else}}there{{/if}} 🎉',
            bodyText: 'We wish you a wonderful day! Enjoy a special treat on us.'
          }
        },
        targetingRules: {
          create: [
            {
              database: 'USER',
              field: 'birthday',
              operator: 'CONTAINS',
              value: todaySuffix as any,
            } as any,
          ]
        }
      }
    });
  } else {
    // Ensure existing birthday template uses valid Handlebars conditional (no JS inside mustaches)
  const existingBirthdayTemplate = await prisma.stepTemplate.findFirst({ where: { campaignStepId: existingBirthdayStep.id, channel: 'EMAIL' } });
    if (existingBirthdayTemplate) {
      const fixedSubject = 'Happy Birthday, {{#if firstName}}{{firstName}}{{else}}there{{/if}} 🎉';
      const needsFix = (existingBirthdayTemplate.subject ?? '').includes('firstName ||')
        || (existingBirthdayTemplate.bodyText ?? '').includes('firstName ||');
      if (needsFix) {
        await prisma.stepTemplate.update({
          where: { id: existingBirthdayTemplate.id },
          data: {
            subject: fixedSubject,
          }
        });
      }
    }
  }

  // If the welcome step already exists, make sure its template uses valid Handlebars too
  if (existingStep) {
  const existingWelcomeTemplate = await prisma.stepTemplate.findFirst({ where: { campaignStepId: existingStep.id, channel: 'EMAIL' } });
    if (existingWelcomeTemplate) {
      const fixedBody = 'Hello {{#if firstName}}{{firstName}}{{else}}there{{/if}}, welcome to Returnacy!';
      const needsFix = (existingWelcomeTemplate.subject ?? '').includes('firstName ||')
        || (existingWelcomeTemplate.bodyText ?? '').includes('firstName ||');
      if (needsFix) {
        await prisma.stepTemplate.update({
          where: { id: existingWelcomeTemplate.id },
          data: {
            bodyText: fixedBody,
          }
        });
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
