import { disconnectSeeds, prisma } from './seeds/connection';
import { seedCoreReferenceData } from './seeds/core';
import { seedDemoMastersClientsReviews } from './seeds/demo';

async function main(): Promise<void> {
  console.log('🌱 Seeding database (dev: core + demo)...');
  console.log(
    'DATABASE_URL:',
    process.env.DATABASE_URL?.substring(0, 30) + '...',
  );

  await seedCoreReferenceData(prisma);
  await seedDemoMastersClientsReviews(prisma);

  console.log(
    '✅ Dev seed completed: admin, categories, cities, tariffs, demo masters/clients/reviews.',
  );
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectSeeds();
  });
