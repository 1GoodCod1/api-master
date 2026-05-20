import type { PrismaClient } from '@prisma/client';
import { randomInt } from 'crypto';

const DEMO_JOB_PREFIX = 'seed-job-';
const DEMO_EMAIL_PREFIX = 'seed-demo-';

type JobType = 'FIXED_PRICE' | 'HOURLY';
type JobStatus = 'OPEN' | 'FOUND' | 'CLOSED';

type JobTemplate = {
  title: string;
  categorySlug: string;
  type: JobType;
  budget?: number;
  hourlyRate?: number;
  minJoints: number;
  status: JobStatus;
};

/** Titluri + categorii aliniate la seed-ul din core.ts și la CreateJobDto (categoryId obligatoriu). */
const JOB_TEMPLATES: JobTemplate[] = [
  // OPEN — preț fix
  {
    title: 'Reparație iPhone 13 — schimb ecran',
    categorySlug: 'remont-telefonov-pk',
    type: 'FIXED_PRICE',
    budget: 1200,
    minJoints: 10,
    status: 'OPEN',
  },
  {
    title: 'Conexiune mașină de spălat',
    categorySlug: 'bytovaya-tehnika',
    type: 'FIXED_PRICE',
    budget: 450,
    minJoints: 5,
    status: 'OPEN',
  },
  {
    title: 'Înlocuire țevi baie',
    categorySlug: 'santehnika',
    type: 'FIXED_PRICE',
    budget: 2800,
    minJoints: 15,
    status: 'OPEN',
  },
  {
    title: 'Montaj plăci bucătărie',
    categorySlug: 'plitka',
    type: 'FIXED_PRICE',
    budget: 3500,
    minJoints: 20,
    status: 'OPEN',
  },
  {
    title: 'Reparație instalație electrică',
    categorySlug: 'elektrika',
    type: 'FIXED_PRICE',
    budget: 1800,
    minJoints: 10,
    status: 'OPEN',
  },
  {
    title: 'Vopsire pereți apartament 2 camere',
    categorySlug: 'otdelochnye-raboty',
    type: 'FIXED_PRICE',
    budget: 4200,
    minJoints: 15,
    status: 'OPEN',
  },
  {
    title: 'Instalare aer condiționat split',
    categorySlug: 'kondicionery-otoplenie',
    type: 'FIXED_PRICE',
    budget: 1500,
    minJoints: 10,
    status: 'OPEN',
  },
  {
    title: 'Montaj mobilier bucătărie',
    categorySlug: 'mebel',
    type: 'FIXED_PRICE',
    budget: 2200,
    minJoints: 12,
    status: 'OPEN',
  },
  {
    title: 'Site vitrină pentru afacere mică',
    categorySlug: 'it-dezvoltare',
    type: 'FIXED_PRICE',
    budget: 8000,
    minJoints: 25,
    status: 'OPEN',
  },
  {
    title: 'Instalare camere video',
    categorySlug: 'internet',
    type: 'FIXED_PRICE',
    budget: 1900,
    minJoints: 10,
    status: 'OPEN',
  },
  // OPEN — orar
  {
    title: 'Meditații matematică liceu',
    categorySlug: 'master-na-chas',
    type: 'HOURLY',
    hourlyRate: 150,
    minJoints: 5,
    status: 'OPEN',
  },
  {
    title: 'Antrenor personal acasă',
    categorySlug: 'antrenori-fitness',
    type: 'HOURLY',
    hourlyRate: 200,
    minJoints: 8,
    status: 'OPEN',
  },
  {
    title: 'Dezvoltare landing page',
    categorySlug: 'it-dezvoltare',
    type: 'HOURLY',
    hourlyRate: 250,
    minJoints: 15,
    status: 'OPEN',
  },
  {
    title: 'Curățenie birou (2× pe săptămână)',
    categorySlug: 'uborka',
    type: 'HOURLY',
    hourlyRate: 120,
    minJoints: 5,
    status: 'OPEN',
  },
  {
    title: 'Ședință foto în aer liber',
    categorySlug: 'foto-video',
    type: 'HOURLY',
    hourlyRate: 180,
    minJoints: 8,
    status: 'OPEN',
  },
  {
    title: 'Promovare SEO magazin online',
    categorySlug: 'smm-marketing',
    type: 'HOURLY',
    hourlyRate: 220,
    minJoints: 12,
    status: 'OPEN',
  },
  // FOUND / CLOSED — fără aplicații demo (status închis)
  {
    title: 'Renovare baie la cheie',
    categorySlug: 'santehnika',
    type: 'FIXED_PRICE',
    budget: 12000,
    minJoints: 30,
    status: 'FOUND',
  },
  {
    title: 'Montaj tavan extensibil',
    categorySlug: 'otdelochnye-raboty',
    type: 'FIXED_PRICE',
    budget: 2400,
    minJoints: 12,
    status: 'FOUND',
  },
  {
    title: 'Mutare apartament 2 camere',
    categorySlug: 'pereezdy',
    type: 'FIXED_PRICE',
    budget: 1600,
    minJoints: 10,
    status: 'FOUND',
  },
  {
    title: 'Design logo și identitate vizuală',
    categorySlug: 'design-grafic',
    type: 'FIXED_PRICE',
    budget: 3000,
    minJoints: 15,
    status: 'FOUND',
  },
  {
    title: 'Înlocuire geamuri PVC',
    categorySlug: 'okna-dveri',
    type: 'FIXED_PRICE',
    budget: 5100,
    minJoints: 20,
    status: 'CLOSED',
  },
  {
    title: 'Service auto — schimb ulei',
    categorySlug: 'avto',
    type: 'FIXED_PRICE',
    budget: 600,
    minJoints: 5,
    status: 'CLOSED',
  },
  {
    title: 'Montaj panouri solare',
    categorySlug: 'panouri-solare',
    type: 'FIXED_PRICE',
    budget: 18500,
    minJoints: 40,
    status: 'CLOSED',
  },
];

const CITIES_RO = ['Chișinău', 'Bălți', 'Cahul', 'Orhei', 'Ungheni', 'Soroca'] as const;

const APPLICATION_DESCRIPTIONS = [
  'Pot prelua lucrarea în următoarele 2–3 zile. Am experiență similară și pot trimite referințe.',
  'Bună ziua! Am instrumentele necesare și pot veni pentru evaluare mâine.',
  'Ofertă serioasă — lucrez curat, cu garanție pe manoperă.',
  'Disponibil și în weekend. Prețul poate fi discutat după vizită.',
] as const;

function pick<T>(arr: readonly T[]): T {
  const el = arr[randomInt(arr.length)];
  if (el === undefined) throw new Error('pick: empty array');
  return el;
}

function pickOpt<T>(arr: readonly T[], chancePercent = 60): T | undefined {
  return randomInt(100) < chancePercent ? pick(arr) : undefined;
}

function staggerCreatedAt(index: number, total: number): Date {
  const minutesAgo = 15 + Math.floor((index / Math.max(total, 1)) * 180) + randomInt(0, 45);
  return new Date(Date.now() - minutesAgo * 60_000);
}

export async function seedDemoJobs(client: PrismaClient): Promise<void> {
  console.log('💼 Demo jobs: cleaning previous seed jobs...');

  const seedJobIds = (
    await client.job.findMany({
      where: { title: { startsWith: DEMO_JOB_PREFIX } },
      select: { id: true },
    })
  ).map((j) => j.id);

  if (seedJobIds.length > 0) {
    await client.jobApplication.deleteMany({
      where: { jobId: { in: seedJobIds } },
    });
    await client.job.deleteMany({
      where: { id: { in: seedJobIds } },
    });
  }

  const clientUsers = await client.user.findMany({
    where: {
      role: 'CLIENT',
      email: { startsWith: DEMO_EMAIL_PREFIX },
    },
    select: { id: true },
    take: 30,
  });

  if (clientUsers.length === 0) {
    console.warn('⚠️  No demo clients found — run main demo seed first');
    return;
  }

  const categories = await client.category.findMany({
    where: { isActive: true },
    select: { id: true, slug: true },
  });
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));
  const fallbackCategoryId = categories[0]?.id;

  if (!fallbackCategoryId) {
    console.warn('⚠️  No categories in DB — run core seed first');
    return;
  }

  const missingSlugs = [
    ...new Set(
      JOB_TEMPLATES.map((t) => t.categorySlug).filter((s) => !categoryIdBySlug.has(s)),
    ),
  ];
  if (missingSlugs.length > 0) {
    console.warn(
      `⚠️  Job seed: missing category slugs (will use fallback): ${missingSlugs.join(', ')}`,
    );
  }

  const cities = await client.city.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  const cityIdByName = new Map(cities.map((c) => [c.name, c.id]));
  const cityIds = cities.map((c) => c.id);

  const masters = await client.master.findMany({
    where: {
      user: { email: { startsWith: DEMO_EMAIL_PREFIX } },
    },
    select: { id: true, categoryId: true },
  });

  let created = 0;
  let applicationsCreated = 0;
  const openJobIds: string[] = [];

  for (let i = 0; i < JOB_TEMPLATES.length; i++) {
    const tpl = JOB_TEMPLATES[i];
    const categoryId =
      categoryIdBySlug.get(tpl.categorySlug) ?? fallbackCategoryId;
    const cityName = pickOpt(CITIES_RO, 75);
    const cityId = cityName
      ? (cityIdByName.get(cityName) ?? pickOpt(cityIds, 50))
      : pickOpt(cityIds, 40);

    const job = await client.job.create({
      data: {
        clientId: pick(clientUsers).id,
        title: `${DEMO_JOB_PREFIX}${tpl.title}`,
        description:
          'Lucrare demo Faber. Descriere scurtă pentru testarea listei de joburi pe homepage.',
        type: tpl.type,
        budget: tpl.type === 'FIXED_PRICE' ? (tpl.budget ?? null) : null,
        hourlyRate: tpl.type === 'HOURLY' ? (tpl.hourlyRate ?? null) : null,
        minJoints: tpl.minJoints,
        cityId: cityId ?? null,
        categoryId,
        status: tpl.status,
        createdAt: staggerCreatedAt(i, JOB_TEMPLATES.length),
      },
    });
    created++;

    if (tpl.status === 'OPEN') {
      openJobIds.push(job.id);
    }
  }

  // Oferte demo pe joburi OPEN (pentru „X oferte” pe homepage)
  for (const jobId of openJobIds) {
    const job = await client.job.findUnique({
      where: { id: jobId },
      select: { id: true, categoryId: true, minJoints: true },
    });
    if (!job?.categoryId) continue;

    const matchingMasters = masters.filter((m) => m.categoryId === job.categoryId);
    const pool =
      matchingMasters.length >= 2
        ? matchingMasters
        : masters.length > 0
          ? masters
          : [];

    const appCount = randomInt(1, Math.min(5, pool.length + 1));
    const usedMasterIds = new Set<string>();

    for (let a = 0; a < appCount && pool.length > 0; a++) {
      let master = pick(pool);
      let guard = 0;
      while (usedMasterIds.has(master.id) && guard++ < 20) {
        master = pick(pool);
      }
      if (usedMasterIds.has(master.id)) continue;
      usedMasterIds.add(master.id);

      const jointsSpent = job.minJoints + randomInt(0, 15);

      try {
        await client.jobApplication.create({
          data: {
            jobId: job.id,
            masterId: master.id,
            jointsSpent,
            description: pick(APPLICATION_DESCRIPTIONS),
            paymentType: 'FULL',
            status: 'PENDING',
          },
        });
        applicationsCreated++;
      } catch {
        // unique (jobId, masterId) — skip duplicate
      }
    }
  }

  const openCount = JOB_TEMPLATES.filter((t) => t.status === 'OPEN').length;
  const backfilled = await backfillJobsMissingCategory(
    client,
    categoryIdBySlug,
    fallbackCategoryId,
  );

  console.log(
    `✅ Demo jobs seeded: ${created} jobs (${openCount} OPEN with categoryId), ${applicationsCreated} applications` +
      (backfilled > 0 ? `, backfilled ${backfilled} jobs without category` : ''),
  );
}

/** Joburi vechi din DB (înainte de categoryId) — aliniere la categorii din seed. */
async function backfillJobsMissingCategory(
  client: PrismaClient,
  categoryIdBySlug: Map<string, string>,
  fallbackCategoryId: string,
): Promise<number> {
  const orphans = await client.job.findMany({
    where: { categoryId: null },
    select: { id: true, title: true },
  });
  if (orphans.length === 0) return 0;

  const rules: { pattern: RegExp; slug: string }[] = [
    { pattern: /iphone|telefon|pc|laptop|reparație.*ecran/i, slug: 'remont-telefonov-pk' },
    { pattern: /spălat|masina de spălat|electrocasnic/i, slug: 'bytovaya-tehnika' },
    { pattern: /țevi|sanitar|baie/i, slug: 'santehnika' },
    { pattern: /plăci|plitka/i, slug: 'plitka' },
    { pattern: /electric/i, slug: 'elektrika' },
    { pattern: /vopsire|finisaj|tavan|laminat|oboi/i, slug: 'otdelochnye-raboty' },
    { pattern: /condiționat|climat/i, slug: 'kondicionery-otoplenie' },
    { pattern: /mobilier|bucătărie/i, slug: 'mebel' },
    { pattern: /site|landing|it|seo|dezvoltare/i, slug: 'it-dezvoltare' },
    { pattern: /video|foto/i, slug: 'foto-video' },
    { pattern: /curățenie|уборк/i, slug: 'uborka' },
    { pattern: /mutare|pereezd|переезд/i, slug: 'pereezdy' },
    { pattern: /logo|design/i, slug: 'design-grafic' },
    { pattern: /auto|ulei/i, slug: 'avto' },
    { pattern: /solar|panouri/i, slug: 'panouri-solare' },
  ];

  let count = 0;
  for (const job of orphans) {
    const title = job.title.toLowerCase();
    const rule = rules.find((r) => r.pattern.test(title));
    const categoryId = rule
      ? (categoryIdBySlug.get(rule.slug) ?? fallbackCategoryId)
      : fallbackCategoryId;
    await client.job.update({
      where: { id: job.id },
      data: { categoryId },
    });
    count++;
  }
  return count;
}
