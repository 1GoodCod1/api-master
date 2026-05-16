import type { PrismaClient } from '@prisma/client';
import { randomInt } from 'crypto';

const DEMO_JOB_PREFIX = 'seed-job-';

const JOB_TITLES_FIXED: string[] = [
  'Замена труб в ванной комнате',
  'Укладка плитки на кухне',
  'Ремонт электрической проводки',
  'Покраска стен в 2-комнатной квартире',
  'Установка кондиционера сплит-системы',
  'Сборка кухонного гарнитура',
  'Монтаж натяжного потолка',
  'Замена окон на пластиковые ПВХ',
  'Ремонт стиральной машины',
  'Установка входной двери',
  'Поклейка обоев в спальне',
  'Укладка ламината в гостиной',
  'Установка видеонаблюдения',
  'Ремонт ванной под ключ',
];

const JOB_TITLES_HOURLY: string[] = [
  'Репетитор по математике для школьника',
  'Персональный тренер (выезд на дом)',
  'Разработка сайта-визитки',
  'Настройка 1С для бухгалтерии',
  'Помощь с переездом и упаковкой вещей',
  'Уборка офиса (2–3 раза в неделю)',
  'Выгул собаки каждый день утром',
  'Фотосессия на природе',
  'Ремонт ноутбука или ПК',
  'SEO-продвижение интернет-магазина',
];

const JOB_DESCRIPTIONS_FIXED: string[] = [
  'Нужен опытный мастер. Работу выполнить аккуратно, без мусора после себя. Всё необходимое можем обсудить заранее.',
  'Ищем профессионала с гарантией на работу. Объём небольшой, но требования к качеству высокие.',
  'Срочно! Нужно сделать до конца недели. Готовы договориться по цене с хорошим мастером.',
  'Квартира после ремонта, нужна финальная отделка. Смета обязательна, работы с чеком.',
  'Частный дом, площадь небольшая. Нужен человек с инструментом и опытом аналогичных работ.',
  'Сделали попытку сами — не вышло. Ищем мастера исправить и довести до конца.',
  'Нужна консультация и выезд для оценки, затем работа. Предпочтительно в выходные.',
];

const JOB_DESCRIPTIONS_HOURLY: string[] = [
  'Ищу специалиста для постоянного сотрудничества. Оплата почасовая, возможно увеличение часов.',
  'Небольшой проект на несколько недель. Гибкий график, работа в основном удалённо или с выездом.',
  'Нужна помощь 2–3 раза в неделю. Пунктуальность и ответственность обязательны.',
  'Задача разовая, но с продолжением если всё пойдёт хорошо. Опишите опыт при отклике.',
  'Частное лицо ищет помощника с практическим опытом. Официальное оформление по договорённости.',
];

const CITIES_RO = ['Chișinău', 'Bălți', 'Cahul', 'Orhei', 'Ungheni', 'Soroca'];

function pick<T>(arr: T[]): T {
  const el = arr[randomInt(arr.length)];
  if (el === undefined) throw new Error('pick: empty array');
  return el;
}

function pickOpt<T>(arr: T[], chancePercent = 60): T | undefined {
  return randomInt(100) < chancePercent ? pick(arr) : undefined;
}

export async function seedDemoJobs(client: PrismaClient): Promise<void> {
  console.log('💼 Demo jobs: cleaning previous seed jobs...');

  await client.job.deleteMany({
    where: { title: { startsWith: DEMO_JOB_PREFIX } },
  });

  // Find existing demo clients
  const clientUsers = await client.user.findMany({
    where: {
      role: 'CLIENT',
      email: { startsWith: 'seed-demo-' },
    },
    select: { id: true },
    take: 20,
  });

  if (clientUsers.length === 0) {
    console.warn('⚠️  No demo clients found — run main demo seed first');
    return;
  }

  const cities = await client.city.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const cityIdByName = new Map(cities.map((c) => [c.name, c.id]));
  const cityIds = cities.map((c) => c.id);

  const jobs: {
    clientId: string;
    title: string;
    description: string;
    type: 'FIXED_PRICE' | 'HOURLY';
    budget?: number;
    hourlyRate?: number;
    minJoints: number;
    cityId?: string;
    status: 'OPEN' | 'FOUND' | 'CLOSED';
  }[] = [];

  // OPEN fixed-price jobs
  for (let i = 0; i < 8; i++) {
    const cl = pick(clientUsers);
    const cityName = pickOpt(CITIES_RO, 70);
    const cityId = cityName
      ? (cityIdByName.get(cityName) ?? pickOpt(cityIds, 60))
      : pickOpt(cityIds, 40);

    jobs.push({
      clientId: cl.id,
      title: `${DEMO_JOB_PREFIX}${pick(JOB_TITLES_FIXED)}`,
      description: pick(JOB_DESCRIPTIONS_FIXED),
      type: 'FIXED_PRICE',
      budget: randomInt(5, 51) * 100,
      minJoints: pick([3, 5, 10, 15, 20]),
      cityId,
      status: 'OPEN',
    });
  }

  // OPEN hourly jobs
  for (let i = 0; i < 6; i++) {
    const cl = pick(clientUsers);
    const cityId = pickOpt(cityIds, 50);

    jobs.push({
      clientId: cl.id,
      title: `${DEMO_JOB_PREFIX}${pick(JOB_TITLES_HOURLY)}`,
      description: pick(JOB_DESCRIPTIONS_HOURLY),
      type: 'HOURLY',
      hourlyRate: pick([80, 100, 120, 150, 180, 200, 250]),
      minJoints: pick([3, 5, 10]),
      cityId,
      status: 'OPEN',
    });
  }

  // FOUND jobs (master selected)
  for (let i = 0; i < 4; i++) {
    const cl = pick(clientUsers);
    const isFixed = randomInt(2) === 0;

    jobs.push({
      clientId: cl.id,
      title: `${DEMO_JOB_PREFIX}${isFixed ? pick(JOB_TITLES_FIXED) : pick(JOB_TITLES_HOURLY)}`,
      description: pick(JOB_DESCRIPTIONS_FIXED),
      type: isFixed ? 'FIXED_PRICE' : 'HOURLY',
      ...(isFixed
        ? { budget: randomInt(3, 21) * 100 }
        : { hourlyRate: pick([100, 120, 150]) }),
      minJoints: pick([5, 10]),
      cityId: pickOpt(cityIds, 60),
      status: 'FOUND',
    });
  }

  // CLOSED jobs
  for (let i = 0; i < 3; i++) {
    const cl = pick(clientUsers);

    jobs.push({
      clientId: cl.id,
      title: `${DEMO_JOB_PREFIX}${pick(JOB_TITLES_FIXED)}`,
      description: pick(JOB_DESCRIPTIONS_FIXED),
      type: 'FIXED_PRICE',
      budget: randomInt(2, 16) * 100,
      minJoints: 5,
      cityId: pickOpt(cityIds, 50),
      status: 'CLOSED',
    });
  }

  let created = 0;
  for (const job of jobs) {
    await client.job.create({
      data: {
        clientId: job.clientId,
        title: job.title,
        description: job.description,
        type: job.type,
        budget: job.budget ?? null,
        hourlyRate: job.hourlyRate ?? null,
        minJoints: job.minJoints,
        cityId: job.cityId ?? null,
        status: job.status as never,
      },
    });
    created++;
  }

  console.log(
    `✅ Demo jobs seeded: ${created} jobs (8 OPEN fixed, 6 OPEN hourly, 4 FOUND, 3 CLOSED)`,
  );
}
