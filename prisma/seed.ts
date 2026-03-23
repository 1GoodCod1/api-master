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
/** Больше данных для стенда / локальной разработки */
const DEMO_MASTER_COUNT = 72;
const DEMO_CLIENT_COUNT = 140;
/** Минимум отзывов только если хватает уникальных клиентов с заявками */
const DEMO_MIN_REVIEWS_PER_MASTER = 4;
const DEMO_MAX_REVIEWS_PER_MASTER = 34;

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
  'Виктор',
  'Людмила',
  'Николай',
  'Кристина',
  'Петру',
  'Дорин',
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
  'Лупу',
  'Кожухарь',
  'Морару',
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
  'Приехал со своим инструментом, без суеты.',
  'Договорились по цене и сдержал слово.',
  'Фото до/после — огонь, жена довольна.',
  'Перезвонил через час, как и обещал.',
  'Видно опыт: с первого взгляда понял, в чём дело.',
  'Единственный минус — очередь, но оно того стоило.',
] as const;

const DEMO_LEAD_MESSAGES = [
  'Здравствуйте, нужна консультация и ориентировочная стоимость.',
  'Когда можете подъехать? Адрес напишу в личку.',
  'Интересует срочный выезд, сегодня или завтра.',
  'Есть фото — куда отправить?',
  'Нужен мастер с опытом, повторное обращение.',
  'Подскажите, работаете ли в выходные?',
  'Готовы оплатить наличными, нужен чек.',
  'Можно ли завтра утром? Этаж 4, лифт есть.',
  'Ищу мастера с отзывами и гарантией на работы.',
  'Нужен повторный визит — доделать мелочи после ремонта.',
] as const;

const DEMO_MASTER_REPLY_TEMPLATES = [
  'Спасибо за отзыв! Буду рад снова помочь — обращайтесь.',
  'Благодарю! Если что-то вспомнится — пишите, подскажу.',
  'Очень приятно! Работаем дальше — звоните в любое время.',
  'Признателен за доверие. Гарантия на работы у нас в силе.',
] as const;

type DemoLeadRow = {
  id: string;
  masterId: string;
  clientPhone: string;
  clientId: string | null;
  clientName: string | null;
  status: LeadStatus;
};

function demoUniqueLeadsPerClient(leads: DemoLeadRow[]): DemoLeadRow[] {
  const seen = new Set<string>();
  const out: DemoLeadRow[] = [];
  for (const l of leads) {
    const key = l.clientId ?? l.clientPhone;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(l);
  }
  return out;
}

function demoBuildMasterDescription(
  categoryName: string,
  cityName: string,
  index: number,
  years: number,
): string {
  const hooks = [
    `Живу и работаю в ${cityName}. ${categoryName} — то, чем занимаюсь каждый день: без «отмазок» и с нормальной гарантией.`,
    `Беру заказы по ${cityName} и ближайшим населённым пунктам. Специализация: ${categoryName}. Опыт около ${years} лет — смотрите отзывы ниже.`,
    `Делаю «как для себя»: ${categoryName}, аккуратно, с фотоотчётом по запросу. Район: ${cityName}.`,
    `Прозрачная смета до старта. ${categoryName} — мой основной профиль, работаю официально и по договорённости.`,
  ];
  return hooks[index % hooks.length] ?? hooks[0];
}

function demoServicePairForCategory(categorySlug: string): {
  a: string;
  b: string;
} {
  const map: Record<string, { a: string; b: string }> = {
    santehnika: {
      a: 'Аварийный выезд / устранение протечки',
      b: 'Монтаж смесителя и сантехники',
    },
    elektrika: {
      a: 'Прокладка линии и розеток',
      b: 'Щиток: диагностика и сборка',
    },
    plitka: {
      a: 'Укладка плитки «под ключ»',
      b: 'Затирка и герметизация швов',
    },
    avto: { a: 'Диагностика и мелкий ремонт', b: 'ТО и замена расходников' },
    'foto-video': {
      a: 'Съёмка мероприятия / портрет',
      b: 'Монтаж ролика, цветокоррекция',
    },
    manikyur: {
      a: 'Маникюр с покрытием',
      b: 'Наращивание / дизайн',
    },
    massazh: {
      a: 'Классический / расслабляющий массаж',
      b: 'Спортивный / лимфодренаж',
    },
    uborka: {
      a: 'Генеральная уборка квартиры',
      b: 'Химчистка мебели / ковров',
    },
  };
  return (
    map[categorySlug] ?? {
      a: 'Стандартный выезд и консультация',
      b: 'Расширенный пакет работ',
    }
  );
}

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
    select: { id: true, name: true, slug: true },
    orderBy: { sortOrder: 'asc' },
  });
  const cities = await client.city.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
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
  const masterLeads = new Map<string, DemoLeadRow[]>();

  for (let i = 1; i <= DEMO_MASTER_COUNT; i++) {
    const phone = `+37361${String(100000 + i).slice(1)}`;
    const cityPick = cities[randomInt(cities.length)];
    const categoryPick = categories[randomInt(categories.length)];
    if (!cityPick || !categoryPick) {
      throw new Error('Demo seed: city/category pick failed');
    }
    const cityId = cityPick.id;
    const categoryId = categoryPick.id;
    const experienceYears = randomInt(1, 22);
    const svc = demoServicePairForCategory(categoryPick.slug);
    const description = demoBuildMasterDescription(
      categoryPick.name,
      cityPick.name,
      i,
      experienceYears,
    );

    const tariffRoll = randomInt(100);
    let tariffType: TariffType = TariffType.BASIC;
    let tariffExpiresAt: Date | null = null;
    let isFeatured = false;
    if (tariffRoll < 22) {
      tariffType = TariffType.PREMIUM;
      tariffExpiresAt = in30d;
      isFeatured = randomInt(100) < 40;
    } else if (tariffRoll < 48) {
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
            description,
            services: [
              {
                title: svc.a,
                price: randomInt(200, 2800),
                durationMin: 60,
              },
              {
                title: svc.b,
                price: randomInt(450, 4200),
                durationMin: 120,
              },
            ],
            cityId,
            categoryId,
            experienceYears,
            tariffType,
            tariffExpiresAt,
            isFeatured,
            pendingVerification: false,
            isOnline: randomInt(100) < 38,
            availabilityStatus: AvailabilityStatus.AVAILABLE,
            views: randomInt(0, 1200),
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
    masterLeads.set(mp.id, []);
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
    /** Слои: сверху — «топ» по заявкам; снизу — новички и малоактивные */
    let nLeads: number;
    if (mi < 10) {
      nLeads = randomInt(65, 120);
    } else if (mi < 22) {
      nLeads = randomInt(32, 68);
    } else if (mi < 40) {
      nLeads = randomInt(14, 36);
    } else if (mi < 56) {
      nLeads = randomInt(6, 22);
    } else if (mi < 66) {
      nLeads = randomInt(2, 12);
    } else {
      nLeads = randomInt(0, 6);
    }

    const bucket = masterLeads.get(master.id);
    if (!bucket) {
      throw new Error('Demo seed: master lead bucket missing');
    }

    for (let k = 0; k < nLeads; k++) {
      const registered = randomInt(100) < 76;
      let clientPhone: string;
      let clientId: string | null;
      let clientName: string | null;
      if (registered) {
        const cl = clientUsers[randomInt(clientUsers.length)];
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
      if (roll < 10) {
        status = LeadStatus.NEW;
      } else if (roll < 26) {
        status = LeadStatus.IN_PROGRESS;
      } else if (roll < 90) {
        status = LeadStatus.CLOSED;
      } else {
        status = LeadStatus.SPAM;
      }

      const leadId = randomUUID();
      await client.lead.create({
        data: {
          id: leadId,
          masterId: master.id,
          clientPhone,
          clientId,
          clientName,
          message: demoPick(DEMO_LEAD_MESSAGES),
          status,
          isPremium: randomInt(100) < 12,
        },
      });
      bucket.push({
        id: leadId,
        masterId: master.id,
        clientPhone,
        clientId,
        clientName,
        status,
      });
      leadRows++;
    }

    await client.master.update({
      where: { id: master.id },
      data: { leadsCount: nLeads },
    });
  }
  console.log(
    `📬 Created ${leadRows} demo leads (tiered volumes; см. логику по индексу мастера).`,
  );

  let reviewCount = 0;
  let replyCount = 0;

  for (const master of masterRecords) {
    const leads = masterLeads.get(master.id) ?? [];
    /** Один отзыв на клиента; не больше числа заявок и не больше уникальных клиентов */
    const eligible = demoUniqueLeadsPerClient(leads).filter(
      (l) => l.status !== LeadStatus.SPAM,
    );
    const maxReviews = Math.min(
      eligible.length,
      DEMO_MAX_REVIEWS_PER_MASTER,
      leads.length,
    );

    let nReviews = 0;
    if (maxReviews > 0) {
      const minReviews = Math.min(DEMO_MIN_REVIEWS_PER_MASTER, maxReviews);
      nReviews = randomInt(minReviews, maxReviews + 1);
    }

    const shuffled = [...eligible].sort(() => randomInt(3) - 1);
    const chosenLeads = shuffled.slice(0, nReviews);

    for (let ri = 0; ri < chosenLeads.length; ri++) {
      const leadRow = chosenLeads[ri];
      if (!leadRow) continue;

      const rating = demoWeightedRating();
      const comment =
        randomInt(100) < 88 ? demoPick(DEMO_REVIEW_COMMENTS) : null;

      const review = await client.review.create({
        data: {
          masterId: master.id,
          clientId: leadRow.clientId,
          clientPhone: leadRow.clientPhone,
          clientName: leadRow.clientName ?? 'Клиент',
          leadId: leadRow.id,
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

      /** Первый отзыв всегда с ответом мастера — как в фильтре «популярные» (visible + reply) */
      const addReply = ri === 0 || randomInt(100) < 48;
      if (addReply) {
        await client.reviewReply.create({
          data: {
            reviewId: review.id,
            masterId: master.id,
            content: demoPick(DEMO_MASTER_REPLY_TEMPLATES),
          },
        });
        replyCount++;
      }
    }

    await demoUpdateMasterAggregates(client, master.id);

    const after = await client.master.findUnique({
      where: { id: master.id },
      select: { leadsCount: true, totalReviews: true },
    });
    if (
      after &&
      after.totalReviews > 0 &&
      after.leadsCount < after.totalReviews
    ) {
      throw new Error(
        `Demo seed invariant failed: master ${master.id} leadsCount=${after.leadsCount} < totalReviews=${after.totalReviews}`,
      );
    }
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

  // Категории: canonical name = ro; переводы + Lucide iconKey для UI
  const categories: {
    name: string;
    slug: string;
    icon: string;
    iconKey: string;
    sortOrder: number;
    translations: {
      ro: { name: string };
      ru: { name: string };
      en: { name: string };
    };
  }[] = [
    {
      slug: 'santehnika',
      name: 'Instalații sanitare',
      icon: '🚿',
      iconKey: 'Droplets',
      sortOrder: 10,
      translations: {
        ro: { name: 'Instalații sanitare' },
        ru: { name: 'Сантехника' },
        en: { name: 'Plumbing' },
      },
    },
    {
      slug: 'elektrika',
      name: 'Electricitate',
      icon: '⚡',
      iconKey: 'Zap',
      sortOrder: 20,
      translations: {
        ro: { name: 'Electricitate' },
        ru: { name: 'Электрика' },
        en: { name: 'Electrical' },
      },
    },
    {
      slug: 'plitka',
      name: 'Lucrări cu plăci ceramice',
      icon: '🧱',
      iconKey: 'LayoutGrid',
      sortOrder: 30,
      translations: {
        ro: { name: 'Lucrări cu plăci ceramice' },
        ru: { name: 'Плиточные работы' },
        en: { name: 'Tiling' },
      },
    },
    {
      slug: 'otdelochnye-raboty',
      name: 'Lucrări de finisaj',
      icon: '🔨',
      iconKey: 'Hammer',
      sortOrder: 40,
      translations: {
        ro: { name: 'Lucrări de finisaj' },
        ru: { name: 'Отделочные работы' },
        en: { name: 'Finishing works' },
      },
    },
    {
      slug: 'krovlya-fasad',
      name: 'Acoperiș și fațadă',
      icon: '🏠',
      iconKey: 'Home',
      sortOrder: 50,
      translations: {
        ro: { name: 'Acoperiș și fațadă' },
        ru: { name: 'Кровля и фасад' },
        en: { name: 'Roofing & facade' },
      },
    },
    {
      slug: 'okna-dveri',
      name: 'Ferestre și uși',
      icon: '🪟',
      iconKey: 'DoorOpen',
      sortOrder: 60,
      translations: {
        ro: { name: 'Ferestre și uși' },
        ru: { name: 'Окна и двери' },
        en: { name: 'Windows & doors' },
      },
    },
    {
      slug: 'bytovaya-tehnika',
      name: 'Reparații electrocasnice',
      icon: '🔌',
      iconKey: 'Plug',
      sortOrder: 70,
      translations: {
        ro: { name: 'Reparații electrocasnice' },
        ru: { name: 'Ремонт бытовой техники' },
        en: { name: 'Home appliances repair' },
      },
    },
    {
      slug: 'remont-telefonov-pk',
      name: 'Reparații telefoane și PC',
      icon: '📱',
      iconKey: 'Smartphone',
      sortOrder: 80,
      translations: {
        ro: { name: 'Reparații telefoane și PC' },
        ru: { name: 'Ремонт телефонов и ПК' },
        en: { name: 'Phone & PC repair' },
      },
    },
    {
      slug: 'ustanovka-tehniki',
      name: 'Instalare echipamente',
      icon: '📺',
      iconKey: 'Tv',
      sortOrder: 90,
      translations: {
        ro: { name: 'Instalare echipamente' },
        ru: { name: 'Установка техники' },
        en: { name: 'Equipment installation' },
      },
    },
    {
      slug: 'kondicionery-otoplenie',
      name: 'Climatizare și încălzire',
      icon: '❄️',
      iconKey: 'Snowflake',
      sortOrder: 100,
      translations: {
        ro: { name: 'Climatizare și încălzire' },
        ru: { name: 'Кондиционеры и отопление' },
        en: { name: 'HVAC' },
      },
    },
    {
      slug: 'pereezdy',
      name: 'Transport marfă și mutări',
      icon: '🚚',
      iconKey: 'Truck',
      sortOrder: 110,
      translations: {
        ro: { name: 'Transport marfă și mutări' },
        ru: { name: 'Грузоперевозки и переезды' },
        en: { name: 'Moving & cargo' },
      },
    },
    {
      slug: 'master-na-chas',
      name: 'Meșter pentru o oră',
      icon: '🧰',
      iconKey: 'Wrench',
      sortOrder: 120,
      translations: {
        ro: { name: 'Meșter pentru o oră' },
        ru: { name: 'Мастер на час' },
        en: { name: 'Handyman' },
      },
    },
    {
      slug: 'vyvoz-musora',
      name: 'Evacuare gunoi',
      icon: '🗑️',
      iconKey: 'Trash2',
      sortOrder: 130,
      translations: {
        ro: { name: 'Evacuare gunoi' },
        ru: { name: 'Вывоз мусора' },
        en: { name: 'Waste removal' },
      },
    },
    {
      slug: 'uborka',
      name: 'Curățenie',
      icon: '🧹',
      iconKey: 'SparklesIcon',
      sortOrder: 140,
      translations: {
        ro: { name: 'Curățenie' },
        ru: { name: 'Уборка и клининг' },
        en: { name: 'Cleaning' },
      },
    },
    {
      slug: 'mebel',
      name: 'Mobilier',
      icon: '🛋️',
      iconKey: 'Sofa',
      sortOrder: 150,
      translations: {
        ro: { name: 'Mobilier' },
        ru: { name: 'Сборка и ремонт мебели' },
        en: { name: 'Furniture' },
      },
    },
    {
      slug: 'landshaft',
      name: 'Peisagistică și grădină',
      icon: '🌳',
      iconKey: 'TreePine',
      sortOrder: 160,
      translations: {
        ro: { name: 'Peisagistică și grădină' },
        ru: { name: 'Ландшафт и участок' },
        en: { name: 'Landscaping' },
      },
    },
    {
      slug: 'internet',
      name: 'Internet și videosecuritate',
      icon: '📡',
      iconKey: 'Wifi',
      sortOrder: 170,
      translations: {
        ro: { name: 'Internet și videosecuritate' },
        ru: { name: 'Интернет и видеонаблюдение' },
        en: { name: 'Internet & CCTV' },
      },
    },
    {
      slug: 'avto',
      name: 'Service auto',
      icon: '🚗',
      iconKey: 'Car',
      sortOrder: 180,
      translations: {
        ro: { name: 'Service auto' },
        ru: { name: 'Автосервис' },
        en: { name: 'Car service' },
      },
    },
    {
      slug: 'foto-video',
      name: 'Fotografie și video',
      icon: '📷',
      iconKey: 'Camera',
      sortOrder: 185,
      translations: {
        ro: { name: 'Fotografie și video' },
        ru: { name: 'Фото и видео' },
        en: { name: 'Photo & video' },
      },
    },
    {
      slug: 'manikyur',
      name: 'Manichiură',
      icon: '💅',
      iconKey: 'Brush',
      sortOrder: 190,
      translations: {
        ro: { name: 'Manichiură' },
        ru: { name: 'Маникюр' },
        en: { name: 'Manicure' },
      },
    },
    {
      slug: 'massazh',
      name: 'Masaj',
      icon: '💆',
      iconKey: 'HeartPulse',
      sortOrder: 195,
      translations: {
        ro: { name: 'Masaj' },
        ru: { name: 'Массаж' },
        en: { name: 'Massage' },
      },
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        icon: category.icon,
        iconKey: category.iconKey,
        translations: category.translations,
        sortOrder: category.sortOrder,
      },
      create: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        iconKey: category.iconKey,
        translations: category.translations,
        sortOrder: category.sortOrder,
      },
    });
  }
  console.log('📂 Categories created (ro/ru/en + iconKey)');

  // Города: canonical name = ro; переводы ru/en
  const citiesData: {
    name: string;
    slug: string;
    translations: {
      ro: { name: string };
      ru: { name: string };
      en: { name: string };
    };
  }[] = [
    {
      slug: 'chisinau',
      name: 'Chișinău',
      translations: {
        ro: { name: 'Chișinău' },
        ru: { name: 'Кишинёв' },
        en: { name: 'Chișinău' },
      },
    },
    {
      slug: 'balti',
      name: 'Bălți',
      translations: {
        ro: { name: 'Bălți' },
        ru: { name: 'Бельцы' },
        en: { name: 'Bălți' },
      },
    },
    {
      slug: 'cahul',
      name: 'Cahul',
      translations: {
        ro: { name: 'Cahul' },
        ru: { name: 'Кагул' },
        en: { name: 'Cahul' },
      },
    },
    {
      slug: 'comrat',
      name: 'Comrat',
      translations: {
        ro: { name: 'Comrat' },
        ru: { name: 'Комрат' },
        en: { name: 'Comrat' },
      },
    },
    {
      slug: 'ungeni',
      name: 'Ungheni',
      translations: {
        ro: { name: 'Ungheni' },
        ru: { name: 'Унгены' },
        en: { name: 'Ungheni' },
      },
    },
    {
      slug: 'orhei',
      name: 'Orhei',
      translations: {
        ro: { name: 'Orhei' },
        ru: { name: 'Орхей' },
        en: { name: 'Orhei' },
      },
    },
    {
      slug: 'soroca',
      name: 'Soroca',
      translations: {
        ro: { name: 'Soroca' },
        ru: { name: 'Сорока' },
        en: { name: 'Soroca' },
      },
    },
    {
      slug: 'hincesti',
      name: 'Hîncești',
      translations: {
        ro: { name: 'Hîncești' },
        ru: { name: 'Хынчешть' },
        en: { name: 'Hîncești' },
      },
    },
    {
      slug: 'floresti',
      name: 'Florești',
      translations: {
        ro: { name: 'Florești' },
        ru: { name: 'Флорешть' },
        en: { name: 'Florești' },
      },
    },
    {
      slug: 'edinet',
      name: 'Edineț',
      translations: {
        ro: { name: 'Edineț' },
        ru: { name: 'Единец' },
        en: { name: 'Edineț' },
      },
    },
    {
      slug: 'straseni',
      name: 'Strășeni',
      translations: {
        ro: { name: 'Strășeni' },
        ru: { name: 'Стрэшень' },
        en: { name: 'Strășeni' },
      },
    },
    {
      slug: 'ceadir-lunga',
      name: 'Ceadîr-Lunga',
      translations: {
        ro: { name: 'Ceadîr-Lunga' },
        ru: { name: 'Чадыр-Лунга' },
        en: { name: 'Ceadîr-Lunga' },
      },
    },
    {
      slug: 'taraclia',
      name: 'Taraclia',
      translations: {
        ro: { name: 'Taraclia' },
        ru: { name: 'Тараклия' },
        en: { name: 'Taraclia' },
      },
    },
    {
      slug: 'cantemir',
      name: 'Cantemir',
      translations: {
        ro: { name: 'Cantemir' },
        ru: { name: 'Кантемир' },
        en: { name: 'Cantemir' },
      },
    },
    {
      slug: 'causeni',
      name: 'Căușeni',
      translations: {
        ro: { name: 'Căușeni' },
        ru: { name: 'Кэушень' },
        en: { name: 'Căușeni' },
      },
    },
    {
      slug: 'ialoveni',
      name: 'Ialoveni',
      translations: {
        ro: { name: 'Ialoveni' },
        ru: { name: 'Яловены' },
        en: { name: 'Ialoveni' },
      },
    },
    {
      slug: 'calarasi',
      name: 'Călărași',
      translations: {
        ro: { name: 'Călărași' },
        ru: { name: 'Кэлэраш' },
        en: { name: 'Călărași' },
      },
    },
    {
      slug: 'criuleni',
      name: 'Criuleni',
      translations: {
        ro: { name: 'Criuleni' },
        ru: { name: 'Криулень' },
        en: { name: 'Criuleni' },
      },
    },
    {
      slug: 'briceni',
      name: 'Briceni',
      translations: {
        ro: { name: 'Briceni' },
        ru: { name: 'Бричень' },
        en: { name: 'Briceni' },
      },
    },
    {
      slug: 'anenii-noi',
      name: 'Anenii Noi',
      translations: {
        ro: { name: 'Anenii Noi' },
        ru: { name: 'Анений-Ной' },
        en: { name: 'Anenii Noi' },
      },
    },
  ];

  for (const city of citiesData) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: {
        name: city.name,
        translations: city.translations,
      },
      create: {
        name: city.name,
        slug: city.slug,
        translations: city.translations,
      },
    });
  }
  console.log('🏙️ Cities created (ro/ru/en)');

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
