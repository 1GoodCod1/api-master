import type { PrismaClient } from '@prisma/client';
import { TariffType, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const DEV_ADMIN_EMAIL = 'admin@faber.md';
const DEV_ADMIN_PASSWORD = 'admin123';
const DEV_ADMIN_PHONE = '+37360000000';

export async function seedAdmin(client: PrismaClient): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';

  const email = process.env.ADMIN_EMAIL || DEV_ADMIN_EMAIL;
  const rawPassword = process.env.ADMIN_PASSWORD || DEV_ADMIN_PASSWORD;
  const phone = process.env.ADMIN_PHONE || DEV_ADMIN_PHONE;

  if (isProd && !process.env.ADMIN_EMAIL) {
    console.warn(
      '⚠️  WARNING: ADMIN_EMAIL is not set! Using default dev email. Set ADMIN_EMAIL in production .env!',
    );
  }
  if (isProd && !process.env.ADMIN_PASSWORD) {
    console.warn(
      '⚠️  WARNING: ADMIN_PASSWORD is not set! Using default dev password. Set ADMIN_PASSWORD in production .env!',
    );
  }

  const hashedPassword = await argon2.hash(rawPassword);

  await client.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      phone,
      role: UserRole.ADMIN,
      isVerified: true,
    },
    create: {
      email,
      phone,
      password: hashedPassword,
      role: UserRole.ADMIN,
      isVerified: true,
    },
  });

  if (isProd) {
    console.log(`👑 Admin seeded: ${email}`);
  } else {
    console.log(`👑 Admin: ${email} / ${rawPassword}`);
  }
}

export async function seedCategories(client: PrismaClient): Promise<void> {
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
    await client.category.upsert({
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
}

export async function seedCities(client: PrismaClient): Promise<void> {
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
    await client.city.upsert({
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
}

/** Тарифы / планы подписки (таблица Tariff) */
export async function seedTariffs(client: PrismaClient): Promise<void> {
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
        'Portfolio (before/after)',
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
        'Portfolio (before/after)',
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
    await client.tariff.upsert({
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
}

/** Справочные данные для prod и dev: админ, категории, города, тарифы */
export async function seedCoreReferenceData(
  client: PrismaClient,
): Promise<void> {
  await seedAdmin(client);
  await seedCategories(client);
  await seedCities(client);
  await seedTariffs(client);
}
