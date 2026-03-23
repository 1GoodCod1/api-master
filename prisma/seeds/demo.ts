import type { PrismaClient } from '@prisma/client';
import {
  AvailabilityStatus,
  LeadStatus,
  ReviewStatus,
  TariffType,
  UserRole,
} from '@prisma/client';
import { randomInt, randomUUID } from 'crypto';
import * as argon2 from 'argon2';

const DEMO_EMAIL_PREFIX = 'seed-demo-';
const DEMO_MASTER_SLUG_PREFIX = 'seed-demo-m-';
const DEMO_CRITERIA = ['quality', 'speed', 'price', 'politeness'] as const;
const DEMO_MASTER_COUNT = 72;
const DEMO_CLIENT_COUNT = 140;
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

export async function seedDemoMastersClientsReviews(
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
