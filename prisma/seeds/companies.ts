import type { PrismaClient } from '@prisma/client';
import {
  CompanyMemberStatus,
  CompanyMode,
  CompanyRole,
  CompanyServicePriceType,
  CompanySubscriptionPlan,
  CompanySubscriptionStatus,
  UserRole,
} from '@prisma/client';
import * as argon2 from 'argon2';

const DEMO_COMPANY_SLUG_PREFIX = 'seed-demo-co-';
const DEMO_COMPANY_EMAIL_PREFIX = 'seed-demo-co-';
const DEMO_PASSWORD = 'demo123';

type CompanyServiceSeed = {
  title: string;
  description?: string;
  priceType: CompanyServicePriceType;
  price?: number;
  sortOrder?: number;
};

type CompanySeedDef = {
  slug: string;
  name: string;
  legalName: string;
  idno: string;
  mode: CompanyMode;
  plan: CompanySubscriptionPlan;
  subscriptionStatus?: CompanySubscriptionStatus;
  periodEndDays?: number | null;
  isPublished?: boolean;
  isVerified?: boolean;
  isTvaPayer?: boolean;
  tvaCode?: string;
  ownerKey: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerFirstName: string;
  ownerLastName: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  services?: CompanyServiceSeed[];
};

const COMPANY_DEFS: CompanySeedDef[] = [
  {
    slug: `${DEMO_COMPANY_SLUG_PREFIX}provider-free`,
    name: 'AquaPro Instal',
    legalName: 'SRL AquaPro Instal',
    idno: '1000000000001',
    mode: CompanyMode.PROVIDER,
    plan: CompanySubscriptionPlan.FREE,
    isPublished: true,
    isVerified: true,
    ownerKey: 'provider-free',
    ownerEmail: `${DEMO_COMPANY_EMAIL_PREFIX}provider-free@demo.local`,
    ownerPhone: '+37363100001',
    ownerFirstName: 'Vasile',
    ownerLastName: 'Moraru',
    description:
      'Сантехника и мелкий ремонт в Кишинёве. Выезд в день обращения, прозрачная смета.',
    contactPhone: '+37363100001',
    contactEmail: `${DEMO_COMPANY_EMAIL_PREFIX}provider-free@demo.local`,
    services: [
      {
        title: 'Аварийный выезд / устранение протечки',
        priceType: CompanyServicePriceType.NEGOTIABLE,
        sortOrder: 0,
      },
      {
        title: 'Монтаж смесителя и сантехники',
        priceType: CompanyServicePriceType.FIXED,
        price: 450,
        sortOrder: 1,
      },
    ],
  },
  {
    slug: `${DEMO_COMPANY_SLUG_PREFIX}provider-pro`,
    name: 'ElectroMax Group',
    legalName: 'SRL ElectroMax Group',
    idno: '1000000000002',
    mode: CompanyMode.PROVIDER,
    plan: CompanySubscriptionPlan.PRO,
    periodEndDays: 30,
    isPublished: true,
    isVerified: true,
    ownerKey: 'provider-pro',
    ownerEmail: `${DEMO_COMPANY_EMAIL_PREFIX}provider-pro@demo.local`,
    ownerPhone: '+37363100002',
    ownerFirstName: 'Ion',
    ownerLastName: 'Ceban',
    description:
      'Электромонтаж для квартир и офисов. PRO-план: расширенный каталог и CRM в кабинете.',
    contactPhone: '+37363100002',
    services: [
      {
        title: 'Прокладка линии и розеток',
        priceType: CompanyServicePriceType.FIXED,
        price: 800,
        sortOrder: 0,
      },
      {
        title: 'Щиток: диагностика и сборка',
        priceType: CompanyServicePriceType.NEGOTIABLE,
        sortOrder: 1,
      },
      {
        title: 'Освещение и диммеры',
        priceType: CompanyServicePriceType.FIXED,
        price: 350,
        sortOrder: 2,
      },
    ],
  },
  {
    slug: `${DEMO_COMPANY_SLUG_PREFIX}provider-business`,
    name: 'BuildMaster Pro',
    legalName: 'SRL BuildMaster Pro',
    idno: '1000000000003',
    mode: CompanyMode.PROVIDER,
    plan: CompanySubscriptionPlan.BUSINESS,
    periodEndDays: 90,
    isPublished: true,
    isVerified: true,
    isTvaPayer: true,
    tvaCode: 'MD1234567',
    ownerKey: 'provider-business',
    ownerEmail: `${DEMO_COMPANY_EMAIL_PREFIX}provider-business@demo.local`,
    ownerPhone: '+37363100003',
    ownerFirstName: 'Andrei',
    ownerLastName: 'Rusnac',
    description:
      'Строительно-отделочные работы под ключ. BUSINESS: операции, счета, расширенная команда.',
    contactPhone: '+37363100003',
    services: [
      {
        title: 'Ремонт квартиры «под ключ»',
        priceType: CompanyServicePriceType.NEGOTIABLE,
        sortOrder: 0,
      },
      {
        title: 'Укладка плитки',
        priceType: CompanyServicePriceType.FIXED,
        price: 1200,
        sortOrder: 1,
      },
    ],
  },
  {
    slug: `${DEMO_COMPANY_SLUG_PREFIX}customer-free`,
    name: 'Hotel Central MD',
    legalName: 'SRL Hotel Central MD',
    idno: '1000000000004',
    mode: CompanyMode.CUSTOMER,
    plan: CompanySubscriptionPlan.FREE,
    isPublished: false,
    ownerKey: 'customer-free',
    ownerEmail: `${DEMO_COMPANY_EMAIL_PREFIX}customer@demo.local`,
    ownerPhone: '+37363100004',
    ownerFirstName: 'Elena',
    ownerLastName: 'Popa',
    description:
      'Заказ услуг от имени компании: уборка, мелкий ремонт, сервис.',
    contactEmail: `${DEMO_COMPANY_EMAIL_PREFIX}customer@demo.local`,
  },
  {
    slug: `${DEMO_COMPANY_SLUG_PREFIX}hybrid-pro`,
    name: 'ServiceHub Moldova',
    legalName: 'SRL ServiceHub Moldova',
    idno: '1000000000005',
    mode: CompanyMode.BOTH,
    plan: CompanySubscriptionPlan.PRO,
    periodEndDays: 30,
    isPublished: true,
    isVerified: true,
    ownerKey: 'hybrid-pro',
    ownerEmail: `${DEMO_COMPANY_EMAIL_PREFIX}hybrid@demo.local`,
    ownerPhone: '+37363100005',
    ownerFirstName: 'Maria',
    ownerLastName: 'Ciobanu',
    description:
      'И заказываем услуги для офиса, и оказываем IT/сервисное обслуживание клиентам.',
    services: [
      {
        title: 'Абонентское обслуживание офиса',
        priceType: CompanyServicePriceType.FIXED,
        price: 2500,
        sortOrder: 0,
      },
    ],
  },
  {
    slug: `${DEMO_COMPANY_SLUG_PREFIX}multi-alpha`,
    name: 'Alpha Logistics',
    legalName: 'SRL Alpha Logistics',
    idno: '1000000000006',
    mode: CompanyMode.CUSTOMER,
    plan: CompanySubscriptionPlan.FREE,
    ownerKey: 'multi-owner',
    ownerEmail: `${DEMO_COMPANY_EMAIL_PREFIX}multi@demo.local`,
    ownerPhone: '+37363100006',
    ownerFirstName: 'Dmitri',
    ownerLastName: 'Botnari',
    description: 'Первая компания владельца — логистика и закупки услуг.',
  },
  {
    slug: `${DEMO_COMPANY_SLUG_PREFIX}multi-beta`,
    name: 'Beta Clean Services',
    legalName: 'SRL Beta Clean Services',
    idno: '1000000000007',
    mode: CompanyMode.PROVIDER,
    plan: CompanySubscriptionPlan.PRO,
    periodEndDays: 30,
    isPublished: true,
    ownerKey: 'multi-owner',
    ownerEmail: `${DEMO_COMPANY_EMAIL_PREFIX}multi@demo.local`,
    ownerPhone: '+37363100006',
    ownerFirstName: 'Dmitri',
    ownerLastName: 'Botnari',
    description:
      'Вторая компания того же владельца — клининг (для теста переключателя компаний).',
    services: [
      {
        title: 'Генеральная уборка офиса',
        priceType: CompanyServicePriceType.FIXED,
        price: 900,
        sortOrder: 0,
      },
    ],
  },
  {
    slug: `${DEMO_COMPANY_SLUG_PREFIX}expired-plan`,
    name: 'Legacy Renov SRL',
    legalName: 'SRL Legacy Renov',
    idno: '1000000000008',
    mode: CompanyMode.PROVIDER,
    plan: CompanySubscriptionPlan.PRO,
    subscriptionStatus: CompanySubscriptionStatus.EXPIRED,
    periodEndDays: -14,
    isPublished: false,
    ownerKey: 'expired',
    ownerEmail: `${DEMO_COMPANY_EMAIL_PREFIX}expired@demo.local`,
    ownerPhone: '+37363100008',
    ownerFirstName: 'Petru',
    ownerLastName: 'Lupu',
    description:
      'Демо компании с истёкшей подпиской PRO (эффективно FREE в API).',
  },
];

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export async function seedDemoCompanies(client: PrismaClient): Promise<void> {
  console.log('🏢 Demo: seeding companies and subscription plans...');

  const existing = await client.company.findMany({
    where: { slug: { startsWith: DEMO_COMPANY_SLUG_PREFIX } },
    select: { id: true },
  });
  if (existing.length > 0) {
    await client.company.deleteMany({
      where: { id: { in: existing.map((c) => c.id) } },
    });
    console.log(
      `   Removed ${existing.length} previous seed-demo-co-* companies`,
    );
  }

  await client.user.deleteMany({
    where: { email: { startsWith: DEMO_COMPANY_EMAIL_PREFIX } },
  });

  const categories = await client.category.findMany({
    where: { isActive: true },
    select: { id: true, slug: true },
    orderBy: { sortOrder: 'asc' },
  });
  const cities = await client.city.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  if (categories.length === 0 || cities.length === 0) {
    throw new Error(
      'Company seed: need categories and cities (run core seed first).',
    );
  }

  const chisinau =
    cities.find((c) => c.name.toLowerCase().includes('chișinău')) ??
    cities.find((c) => c.name.toLowerCase().includes('chisinau')) ??
    cities[0];
  const defaultCategory =
    categories.find((c) => c.slug === 'santehnika') ?? categories[0];

  const demoPassword = await argon2.hash(DEMO_PASSWORD);
  const now = new Date();
  const ownerIds = new Map<string, string>();

  for (const def of COMPANY_DEFS) {
    let ownerUserId = ownerIds.get(def.ownerKey);
    if (!ownerUserId) {
      const user = await client.user.create({
        data: {
          email: def.ownerEmail,
          phone: def.ownerPhone,
          password: demoPassword,
          role: UserRole.CLIENT,
          isVerified: true,
          firstName: def.ownerFirstName,
          lastName: def.ownerLastName,
        },
        select: { id: true },
      });
      ownerUserId = user.id;
      ownerIds.set(def.ownerKey, ownerUserId);
    }

    const periodEnd =
      def.periodEndDays == null ? null : addDays(now, def.periodEndDays);

    const company = await client.company.create({
      data: {
        slug: def.slug,
        ownerUserId,
        name: def.name,
        legalName: def.legalName,
        idno: def.idno,
        legalAddress: 'str. Demo 10, Chișinău, MD-2001',
        mode: def.mode,
        isTvaPayer: def.isTvaPayer ?? false,
        tvaCode: def.tvaCode,
        description: def.description,
        cityId: chisinau.id,
        categoryId: defaultCategory.id,
        isPublished: def.isPublished ?? false,
        isVerified: def.isVerified ?? false,
        contactPhone: def.contactPhone ?? def.ownerPhone,
        contactEmail: def.contactEmail ?? def.ownerEmail,
        billingEmail: def.ownerEmail,
        teamSize: 1,
      },
    });

    await client.companyMember.create({
      data: {
        companyId: company.id,
        userId: ownerUserId,
        role: CompanyRole.OWNER,
        status: CompanyMemberStatus.ACTIVE,
      },
    });

    await client.companySubscription.create({
      data: {
        companyId: company.id,
        plan: def.plan,
        status: def.subscriptionStatus ?? CompanySubscriptionStatus.ACTIVE,
        periodStart: now,
        periodEnd,
        activatedBy: ownerUserId,
      },
    });

    if (def.services?.length) {
      await client.companyService.createMany({
        data: def.services.map((svc, index) => ({
          companyId: company.id,
          title: svc.title,
          description: svc.description,
          priceType: svc.priceType,
          price: svc.price,
          sortOrder: svc.sortOrder ?? index,
          isActive: true,
        })),
      });
    }
  }

  console.log(
    `✅ Created ${COMPANY_DEFS.length} demo companies with subscriptions`,
  );
  console.log('   Password for all company owners: demo123');
  console.log('   Accounts:');
  const printed = new Set<string>();
  for (const def of COMPANY_DEFS) {
    if (printed.has(def.ownerEmail)) continue;
    printed.add(def.ownerEmail);
    const companies = COMPANY_DEFS.filter(
      (c) => c.ownerEmail === def.ownerEmail,
    ).map((c) => `${c.name} (${c.plan})`);
    console.log(`   • ${def.ownerEmail} → ${companies.join('; ')}`);
  }
  console.log(
    `   • Multi-company switcher: ${DEMO_COMPANY_EMAIL_PREFIX}multi@demo.local (2 companies)`,
  );
}
