"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcrypt = __importStar(require("bcrypt"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('🌱 Seeding database...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 30) + '...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
        where: { email: 'admin@moldmasters.md' },
        update: {},
        create: {
            email: 'admin@moldmasters.md',
            phone: '+37360000000',
            password: adminPassword,
            role: client_1.UserRole.ADMIN,
            isVerified: true,
        },
    });
    console.log('👑 Admin: admin@moldmasters.md / admin123');
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
    const tariffs = [
        {
            name: 'BASIC Plan',
            type: client_1.TariffType.BASIC,
            price: '0 MDL',
            amount: 0,
            days: 0,
            description: 'Start and receive first leads',
            features: [
                'Public profile',
                'Up to 5 photos',
                'Receive leads',
                'Reviews',
            ],
            isActive: true,
            sortOrder: 1,
        },
        {
            name: 'VIP Plan',
            type: client_1.TariffType.VIP,
            price: '149 MDL / month',
            amount: 149,
            days: 30,
            description: 'More visibility, more clients',
            features: [
                'VIP badge',
                'Higher in search results',
                'Up to 10 photos',
                'Phone visible immediately',
                'Basic analytics',
            ],
            isActive: true,
            sortOrder: 2,
        },
        {
            name: 'PREMIUM Plan',
            type: client_1.TariffType.PREMIUM,
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
                'Telegram / WhatsApp button',
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
    console.log('✅ Seeding completed: admin, categories, cities, tariffs.');
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
//# sourceMappingURL=seed.js.map