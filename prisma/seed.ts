import {
  AvailabilityStatus,
  LeadStatus,
  PrismaClient,
  ReviewStatus,
  TariffType,
  UserRole,
} from '@prisma/client';
import { randomInt, randomUUID } from 'crypto';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// --- demo masters / clients / reviews (seed-demo-*)
const DEMO_EMAIL_PREFIX = 'seed-demo-';
const DEMO_MASTER_SLUG_PREFIX = 'seed-demo-m-';
const DEMO_CRITERIA = ['quality', 'speed', 'price', 'politeness'] as const;
const DEMO_MASTER_COUNT = 28;
const DEMO_CLIENT_COUNT = 55;
const DEMO_MIN_REVIEWS_PER_MASTER = 4;
const DEMO_MAX_REVIEWS_PER_MASTER = 22;

const DEMO_FIRST_NAMES = [
  'Андрей',
  'Мария',
  'Ион',
  'Елена',
  'Василе',
  'Ольга',
  'Дмитрий',
  'Анна',
  'Сергей',
  'Наталья',
] as const;
const DEMO_LAST_NAMES = [
  'Попеску',
  'Русу',
  'Чобану',
  'Мельник',
  'Кожокарь',
  'Туркану',
  'Бодю',
  'Григоришин',
] as const;
const DEMO_REVIEW_COMMENTS = [
  'Всё сделали быстро и аккуратно, рекомендую.',
  'Остался доволен, приеду ещё.',
  'Цена адекватная, мастер вежливый.',
  'Немного задержались, но качество на высоте.',
  'Супер работа, спасибо!',
  'Нормально, без сюрпризов.',
  'Лучший мастер в городе, всё объяснил.',
  'Хорошо, но можно было быстрее.',
] as const;

const DEMO_LEAD_MESSAGES = [
  'Здравствуйте, нужна консультация и ориентировочная стоимость.',
  'Когда можете подъехать? Адрес напишу в личку.',
  'Интересует срочный выезд, сегодня или завтра.',
  'Есть фото — куда отправить?',
  'Нужен мастер с опытом, повторное обращение.',
  'Подскажите, работаете ли в выходные?',
  'Готовы оплатить наличными, нужен чек.',
] as const;

function demoPick<T>(arr: readonly T[]): T {
  const idx = randomInt(arr.length);
  const el = arr[idx];
  if (el === undefined) {
    throw new Error('demoPick: empty array');
  }
  return el;
}

function demoWeightedRating(): number {
  const r = randomInt(100);
  if (r < 55) return 5;
  if (r < 82) return 4;
  if (r < 94) return 3;
  if (r < 98) return 2;
  return 1;
}

function demoClampCriteria(main: number): number {
  const delta = randomInt(-1, 2);
  return Math.min(5, Math.max(1, main + delta));
}

async function demoUpdateMasterAggregates(
  client: PrismaClient,
  masterId: string,
): Promise<void> {
  const reviews = await client.review.findMany({
    where: { masterId, status: ReviewStatus.VISIBLE },
    select: { rating: true },
  });
  if (reviews.length === 0) {
    await client.master.update({
      where: { id: masterId },
      data: { rating: 0, totalReviews: 0 },
    });
    return;
  }
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  await client.master.update({
    where: { id: masterId },
    data: { rating: avg, totalReviews: reviews.length },
  });
}

async function seedDemoMastersClientsReviews(
  client: PrismaClient,
): Promise<void> {
  console.log('🧪 Demo: cleaning previous seed-demo-* rows...');

  const existingMasters = await client.master.findMany({
    where: { slug: { startsWith: DEMO_MASTER_SLUG_PREFIX } },
    select: { id: true },
  });
  const masterIds = existingMasters.map((m) => m.id);
  if (masterIds.length > 0) {
    await client.master.deleteMany({ where: { id: { in: masterIds } } });
  }

  await client.user.deleteMany({
    where: { email: { startsWith: DEMO_EMAIL_PREFIX } },
  });

  const categories = await client.category.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: { sortOrder: 'asc' },
  });
  const cities = await client.city.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: { name: 'asc' },
  });

  if (categories.length === 0 || cities.length === 0) {
    throw new Error('Demo seed: need at least one category and one city.');
  }

  const demoPassword = await argon2.hash('demo123');
  const now = new Date();
  const in30d = new Date(now);
  in30d.setDate(in30d.getDate() + 30);

  const clientUsers: { id: string; phone: string; firstName: string | null }[] =
    [];

  for (let i = 1; i <= DEMO_CLIENT_COUNT; i++) {
    const phone = `+37362${String(100000 + i).slice(1)}`;
    const u = await client.user.create({
      data: {
        email: `${DEMO_EMAIL_PREFIX}c-${String(i).padStart(3, '0')}@demo.local`,
        phone,
        password: demoPassword,
        role: UserRole.CLIENT,
        isVerified: true,
        firstName: demoPick(DEMO_FIRST_NAMES),
        lastName: demoPick(DEMO_LAST_NAMES),
      },
      select: { id: true, phone: true, firstName: true },
    });
    clientUsers.push(u);
  }
  console.log(
    `👥 Created ${DEMO_CLIENT_COUNT} demo clients (password: demo123)`,
  );

  const masterRecords: { id: string; userId: string }[] = [];

  for (let i = 1; i <= DEMO_MASTER_COUNT; i++) {
    const phone = `+37361${String(100000 + i).slice(1)}`;
    const cityPick = cities[randomInt(cities.length)];
    const categoryPick = categories[randomInt(categories.length)];
    if (!cityPick || !categoryPick) {
      throw new Error('Demo seed: city/category pick failed');
    }
    const cityId = cityPick.id;
    const categoryId = categoryPick.id;

    const tariffRoll = randomInt(100);
    let tariffType: TariffType = TariffType.BASIC;
    let tariffExpiresAt: Date | null = null;
    let isFeatured = false;
    if (tariffRoll < 25) {
      tariffType = TariffType.PREMIUM;
      tariffExpiresAt = in30d;
      isFeatured = randomInt(100) < 40;
    } else if (tariffRoll < 55) {
      tariffType = TariffType.VIP;
      tariffExpiresAt = in30d;
    }

    const user = await client.user.create({
      data: {
        email: `${DEMO_EMAIL_PREFIX}m-${String(i).padStart(3, '0')}@demo.local`,
        phone,
        password: demoPassword,
        role: UserRole.MASTER,
        isVerified: true,
        firstName: demoPick(DEMO_FIRST_NAMES),
        lastName: demoPick(DEMO_LAST_NAMES),
        masterProfile: {
          create: {
            slug: `${DEMO_MASTER_SLUG_PREFIX}${String(i).padStart(3, '0')}`,
            description: `Демо-мастер #${i}. Опыт ${randomInt(1, 17)} лет. Работаю качественно, с гарантией.`,
            services: [
              {
                title: 'Стандартная услуга',
                price: randomInt(200, 2500),
                durationMin: 60,
              },
              {
                title: 'Расширенный пакет',
                price: randomInt(500, 4000),
                durationMin: 120,
              },
            ],
            cityId,
            categoryId,
            experienceYears: randomInt(1, 21),
            tariffType,
            tariffExpiresAt,
            isFeatured,
            pendingVerification: false,
            isOnline: randomInt(100) < 35,
            availabilityStatus: AvailabilityStatus.AVAILABLE,
            views: randomInt(0, 500),
            leadsCount: 0,
          },
        },
      },
      include: { masterProfile: { select: { id: true } } },
    });

    const mp = user.masterProfile;
    if (!mp) {
      throw new Error('Demo seed: masterProfile missing after create');
    }
    masterRecords.push({ id: mp.id, userId: user.id });
  }
  console.log(
    `🛠️ Created ${DEMO_MASTER_COUNT} demo masters (password: demo123), slugs ${DEMO_MASTER_SLUG_PREFIX}001…`,
  );

  let leadRows = 0;
  let synthPhoneSeq = 0;
  for (let mi = 0; mi < masterRecords.length; mi++) {
    const master = masterRecords[mi];
    if (!master) {
      continue;
    }
    /** «Популярные» мастера — много заявок (как для блока популярных в поиске) */
    let nLeads: number;
    if (mi < 6) {
      nLeads = randomInt(42, 96);
    } else if (mi < 12) {
      nLeads = randomInt(18, 41);
    } else {
      nLeads = randomInt(0, 10);
    }

    for (let k = 0; k < nLeads; k++) {
      const registered = randomInt(100) < 72;
      let clientPhone: string;
      let clientId: string | null;
      let clientName: string | null;
      if (registered) {
        const cl = clientUsers[k % clientUsers.length];
        if (!cl) {
          throw new Error('Demo seed: clientUsers empty');
        }
        clientPhone = cl.phone;
        clientId = cl.id;
        clientName = cl.firstName ?? 'Клиент';
      } else {
        synthPhoneSeq += 1;
        clientPhone = `+373990${String(synthPhoneSeq).padStart(5, '0')}`;
        clientId = null;
        clientName = 'Гость';
      }

      const roll = randomInt(100);
      let status: LeadStatus;
      if (roll < 12) {
        status = LeadStatus.NEW;
      } else if (roll < 30) {
        status = LeadStatus.IN_PROGRESS;
      } else if (roll < 90) {
        status = LeadStatus.CLOSED;
      } else {
        status = LeadStatus.SPAM;
      }

      await client.lead.create({
        data: {
          id: randomUUID(),
          masterId: master.id,
          clientPhone,
          clientId,
          clientName,
          message: demoPick(DEMO_LEAD_MESSAGES),
          status,
          isPremium: randomInt(100) < 10,
        },
      });
      leadRows++;
    }

    await client.master.update({
      where: { id: master.id },
      data: { leadsCount: nLeads },
    });
  }
  console.log(
    `📬 Created ${leadRows} demo leads (first 6 masters: ~42–95 each; next 6: ~18–40; others: 0–9).`,
  );

  let reviewCount = 0;
  let replyCount = 0;

  for (const master of masterRecords) {
    const nReviews = randomInt(
      DEMO_MIN_REVIEWS_PER_MASTER,
      DEMO_MAX_REVIEWS_PER_MASTER + 1,
    );
    const shuffled = [...clientUsers].sort(() => randomInt(3) - 1);
    const chosen = shuffled.slice(0, Math.min(nReviews, shuffled.length));

    for (const cl of chosen) {
      const rating = demoWeightedRating();
      const comment =
        randomInt(100) < 85 ? demoPick(DEMO_REVIEW_COMMENTS) : null;

      const review = await client.review.create({
        data: {
          masterId: master.id,
          clientId: cl.id,
          clientPhone: cl.phone,
          clientName: cl.firstName ?? 'Клиент',
          rating,
          comment,
          status: ReviewStatus.VISIBLE,
          reviewCriteria: {
            create: DEMO_CRITERIA.map((criteria) => ({
              criteria,
              rating: demoClampCriteria(rating),
            })),
          },
        },
      });
      reviewCount++;

      if (randomInt(100) < 45) {
        await client.reviewReply.create({
          data: {
            reviewId: review.id,
            masterId: master.id,
            content: 'Спасибо за отзыв! Буду рад снова помочь — обращайтесь.',
          },
        });
        replyCount++;
      }
    }

    await demoUpdateMasterAggregates(client, master.id);
  }

  console.log(
    `⭐ Created ${reviewCount} visible reviews (${replyCount} with master replies); master.rating / totalReviews updated.`,
  );
  console.log(
    '📋 Demo logins: seed-demo-m-001@demo.local … / seed-demo-c-001@demo.local … — password demo123',
  );
}

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');
  console.log(
    'DATABASE_URL:',
    process.env.DATABASE_URL?.substring(0, 30) + '...',
  );

  // Create admin user
  const adminPassword = await argon2.hash('admin123');
  await prisma.user.upsert({
    where: { email: 'admin@master-hub.md' },
    update: {},
    create: {
      email: 'admin@master-hub.md',
      phone: '+37360000000',
      password: adminPassword,
      role: UserRole.ADMIN,
      isVerified: true,
    },
  });
  console.log('👑 Admin: admin@master-hub.md / admin123');

  // Create categories (услуги для Молдовы, enhanced)
  const categoriesData = [
    { name: 'Ремонт техники', slug: 'remont-tehniki', icon: '🔧' },
    { name: 'Ремонт телефонов и ПК', slug: 'remont-telefonov-pk', icon: '📱' },
    { name: 'Строительство', slug: 'stroitelstvo', icon: '🏗️' },
    { name: 'Отделочные работы', slug: 'otdelochnye-raboty', icon: '🎨' },
    { name: 'Сантехника', slug: 'santehnika', icon: '🚿' },
    { name: 'Электрика', slug: 'elektrika', icon: '⚡' },
    { name: 'Мебель', slug: 'mebel', icon: '🛋️' },
    { name: 'Уборка и клининг', slug: 'uborka-klining', icon: '🧹' },
    { name: 'Курьерские услуги', slug: 'kurierskie-uslugi', icon: '🚚' },
    {
      name: 'Грузоперевозки и переезды',
      slug: 'gruzoperevozki-pereezdy',
      icon: '📦',
    },
    { name: 'Услуги красоты', slug: 'uslugi-krasoty', icon: '💇' },
    { name: 'Фото и видеосъёмка', slug: 'foto-video', icon: '📷' },
    { name: 'Ремонт авто', slug: 'remont-avto', icon: '🚗' },
    { name: 'Ландшафт и сад', slug: 'landshaft-sad', icon: '🌳' },
    { name: 'Кровля и фасад', slug: 'krovlya-fasad', icon: '🏠' },
    { name: 'Окна и двери', slug: 'okna-dveri', icon: '🪟' },
    {
      name: 'Кондиционеры и вентиляция',
      slug: 'kondicionery-ventilyaciya',
      icon: '❄️',
    },
    {
      name: 'Сварка и металлообработка',
      slug: 'svarka-metalloobrabotka',
      icon: '⚙️',
    },
    {
      name: 'Репетиторство и обучение',
      slug: 'repetitorstvo-obuchenie',
      icon: '📚',
    },
    { name: 'Свадьбы и праздники', slug: 'svadby-prazdniki', icon: '🎉' },
    { name: 'Юридические услуги', slug: 'yuridicheskie-uslugi', icon: '⚖️' },
    { name: 'Бухгалтерия и налоги', slug: 'buhgalteriya-nalogi', icon: '📊' },
    { name: 'Уход за детьми', slug: 'uhod-za-detmi', icon: '👶' },
    { name: 'Уход за животными', slug: 'uhod-za-zhivotnymi', icon: '🐕' },
    { name: 'Ритуальные услуги', slug: 'ritualnye-uslugi', icon: '🕯️' },
    {
      name: 'Ремонт бытовой техники',
      slug: 'remont-bytovoy-tehniki',
      icon: '🔌',
    },
    { name: 'Установка техники', slug: 'ustanovka-tehniki', icon: '📺' },
    {
      name: 'Дезинсекция и дератизация',
      slug: 'dezinsektciya-deratizaciya',
      icon: '🐛',
    },
  ];

  for (const category of categoriesData) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }
  console.log('📂 Categories created');

  // Create cities (города и муниципии Молдовы)
  const citiesData = [
    { name: 'Кишинёв', slug: 'chisinau' },
    { name: 'Бельцы', slug: 'balti' },
    { name: 'Бендеры', slug: 'bender' },
    { name: 'Тирасполь', slug: 'tiraspol' },
    { name: 'Кагул', slug: 'cahul' },
    { name: 'Унгены', slug: 'ungeni' },
    { name: 'Сорока', slug: 'soroca' },
    { name: 'Орхей', slug: 'orhei' },
    { name: 'Дубоссары', slug: 'dubasari' },
    { name: 'Комрат', slug: 'comrat' },
    { name: 'Стрэшень', slug: 'straseni' },
    { name: 'Дрокия', slug: 'drochia' },
    { name: 'Чадыр-Лунга', slug: 'ceadir-lunga' },
    { name: 'Единец', slug: 'edinet' },
    { name: 'Хынчешть', slug: 'hincesti' },
    { name: 'Флорешть', slug: 'floresti' },
    { name: 'Тараклия', slug: 'taraclia' },
    { name: 'Ниспорены', slug: 'nisporeni' },
    { name: 'Кантемир', slug: 'cantemir' },
    { name: 'Бричень', slug: 'briceni' },
    { name: 'Алений-Ной', slug: 'anenii-noi' },
  ];

  for (const city of citiesData) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: {},
      create: city,
    });
  }
  console.log('🏙️ Cities created');

  // Create tariffs
  // Feature lists must match backend logic (files.service, analytics, export, masters, plan.ts)
  const tariffs = [
    {
      name: 'BASIC Plan',
      type: TariffType.BASIC,
      price: '0 MDL',
      amount: 0,
      days: 0,
      description: 'Start and receive first leads',
      features: [
        'Public profile',
        'Up to 5 photos',
        'Receive leads',
        'Reviews',
        'Basic analytics',
      ],
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'VIP Plan',
      type: TariffType.VIP,
      price: '149 MDL / month',
      amount: 149,
      days: 30,
      description: 'More visibility, more clients',
      features: [
        'VIP badge',
        'Higher in search results',
        'Up to 10 photos',
        'Basic analytics',
        'Telegram / WhatsApp notifications',
      ],
      isActive: true,
      sortOrder: 2,
    },
    {
      name: 'PREMIUM Plan',
      type: TariffType.PREMIUM,
      price: '299 MDL / month',
      amount: 299,
      days: 30,
      description: 'Maximum exposure & leads',
      features: [
        'Top positions in catalog',
        'Featured on homepage',
        'Up to 15 photos',
        'Auto-boost profile',
        'Advanced analytics',
        'Availability status & leads limit',
        'Export leads & analytics (CSV, Excel, PDF)',
        'Service promotions & discounts',
        'Telegram / WhatsApp notifications',
      ],
      isActive: true,
      sortOrder: 3,
    },
  ];

  for (const tariff of tariffs) {
    await prisma.tariff.upsert({
      where: { type: tariff.type },
      update: {
        name: tariff.name,
        price: tariff.price,
        amount: tariff.amount,
        days: tariff.days,
        description: tariff.description,
        features: tariff.features,
        isActive: tariff.isActive,
        sortOrder: tariff.sortOrder,
      },
      create: tariff,
    });
  }
  console.log('💎 Tariffs created');

  await seedDemoMastersClientsReviews(prisma);

  console.log(
    '✅ Seeding completed: admin, categories, cities, tariffs, demo masters/clients/reviews.',
  );
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
