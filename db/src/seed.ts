import { prisma } from './prismaClient.js';

async function main() {
  // Minimal seed: create a brand and a business and an example draft campaign.
  // Note: The current schema doesn't define Brand/Business tables; Campaign holds optional brandId/businessId strings.
  // We'll use stable UUID-like strings for easy reference in tests.
  const brandId = 'brand_seed_1';
  const businessId = 'biz_seed_1';

  // Create a draft campaign scoped to the business, with one basic step and template
  const campaign = await prisma.campaign.create({
    data: {
      businessId,
      brandId: null,
      name: 'Welcome Campaign',
      description: 'Seeded draft campaign',
      status: 'DRAFT',
      scheduleType: 'ONE_TIME',
      startAt: null,
      endAt: null,
      steps: {
        create: [
          {
            stepOrder: 1,
            name: 'Send welcome email',
            description: 'Initial welcome message to new users',
            channel: 'EMAIL',
            template: {
              create: {
                channel: 'EMAIL',
                subject: 'Welcome to Returnacy',
                bodyText: 'Thanks for joining! This is a seeded message.',
                bodyHtml: '<p>Thanks for joining! This is a seeded message.</p>',
              },
            },
          },
        ],
      },
    },
  });

  // Output useful values for wiring env and memberships
  console.log('Seed complete');
  console.log('brandId:', brandId);
  console.log('businessId:', businessId);
  console.log('campaignId:', campaign.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
