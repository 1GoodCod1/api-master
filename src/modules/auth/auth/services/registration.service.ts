import {
  Injectable,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma, type User, type Master } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { RegisterDto } from '../dto/register.dto';
import { TokenService } from './token.service';
import { InAppNotificationService } from '../../../notifications/notifications/services/in-app-notification.service';
import { EmailDripService } from '../../../email/email-drip.service';
import { ReferralsService } from '../../../engagement/referrals/referrals.service';
import { AuditService } from '../../../audit/audit.service';

type PrismaTransactionClient = Parameters<
  Parameters<PrismaService['$transaction']>[0]
>[0];

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly cache: CacheService,
    private readonly inAppNotifications: InAppNotificationService,
    private readonly emailDripService: EmailDripService,
    private readonly referralsService: ReferralsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Главный метод регистрации (оркестратор)
   */
  async register(registerDto: RegisterDto) {
    // 1. Валидация входных данных
    this.validateInput(registerDto);

    // 2. Проверка на уникальность (email/phone)
    await this.ensureUserUnique(registerDto.email, registerDto.phone);

    // 3. Хеширование пароля
    const hashedPassword = await argon2.hash(registerDto.password);

    let user: User;
    let master: Master | undefined;

    if (registerDto.role === 'MASTER') {
      // 4. Подготовка данных для мастера (поиск сущностей)
      const { cityId, categoryId } = await this.prepareMasterRequiredData(
        registerDto.city!,
        registerDto.category!,
      );

      // 5-7. Создание профилей в транзакции
      const result = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: registerDto.email,
            phone: registerDto.phone,
            password: hashedPassword,
            role: 'MASTER',
            isVerified: false,
            firstName: registerDto.firstName!,
            lastName: registerDto.lastName!,
          },
        });

        const slug = await this.generateSlug(
          tx,
          registerDto.firstName!,
          registerDto.lastName!,
        );

        // Премиум не выдаётся при регистрации — только после успешной верификации
        const newMaster = await tx.master.create({
          data: {
            userId: newUser.id,
            slug,
            cityId,
            categoryId,
            description: registerDto.description || null,
            rating: 0,
            totalReviews: 0,
            experienceYears: 0,
            tariffType: 'BASIC',
            views: 0,
            leadsCount: 0,
          },
        });

        return { user: newUser, master: newMaster };
      });

      user = result.user;
      master = result.master;

      // Инвалидируем кеш новых мастеров — новый мастер сразу появится в секции "Новые мастера"
      // + кеш категорий — обновится количество мастеров в категории
      await Promise.all([
        this.cache.invalidate(this.cache.patterns.mastersNew()),
        this.cache.invalidate(this.cache.patterns.categoriesAll()),
      ]);
    } else {
      // Регистрация обычного клиента
      user = await this.prisma.user.create({
        data: {
          email: registerDto.email,
          phone: registerDto.phone,
          password: hashedPassword,
          role: 'CLIENT',
          isVerified: false,
          firstName: registerDto.firstName?.trim() || null,
          lastName: registerDto.lastName?.trim() || null,
        },
      });
    }

    // Обработка реферального кода, если он есть
    if (registerDto.referralCode) {
      try {
        await this.referralsService.applyReferralCode(
          user.id,
          registerDto.referralCode,
        );
      } catch (err) {
        this.logger.error(
          `Failed to apply referral code for user ${user.id}:`,
          err,
        );
      }
    }

    // Запуск email-цепочки
    try {
      const chainType = user.role === 'MASTER' ? 'master_welcome' : 'welcome';
      await this.emailDripService.startChain(user.id, chainType);
    } catch (err) {
      this.logger.error(
        `Failed to start welcome email chain for user ${user.id}:`,
        err,
      );
    }

    // 7.5. In-app уведомление админам о новой регистрации
    try {
      const name = [registerDto.firstName, registerDto.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      await this.inAppNotifications.notifyNewRegistration({
        userId: user.id,
        role: user.role,
        name: name || undefined,
      });
    } catch (err) {
      this.logger.error('Ошибка отправки уведомления о новой регистрации', err);
    }

    // 7.6. Audit log — регистрация
    try {
      await this.auditService.log({
        userId: user.id,
        action: 'USER_REGISTERED',
        entityType: 'User',
        entityId: user.id,
        newData: {
          role: user.role,
          email: user.email,
        } satisfies Prisma.InputJsonValue,
      });
    } catch (err) {
      this.logger.error('Ошибка audit log при регистрации', err);
    }

    // 8. Генерация токенов и финальный ответ
    return this.assembleResponse(
      user,
      master,
      registerDto.city,
      registerDto.category,
    );
  }

  // ==================== Вспомогательные методы (Private) ====================

  private validateInput(dto: RegisterDto) {
    const { role = 'CLIENT', city, category, firstName, lastName } = dto;

    if (role !== 'MASTER' && role !== 'CLIENT') {
      throw new BadRequestException(
        'Only MASTER or CLIENT registration is allowed',
      );
    }

    if (role === 'MASTER' && (!city || !category || !firstName || !lastName)) {
      throw new BadRequestException(
        'For MASTER registration: city, category, firstName, and lastName are required',
      );
    }
  }

  private async ensureUserUnique(email: string, phone: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this email or phone already exists',
      );
    }
  }

  private async prepareMasterRequiredData(
    citySlugOrName: string,
    categorySlugOrName: string,
  ) {
    const [foundCity, foundCategory] = await Promise.all([
      this.findCityBySlugOrName(citySlugOrName),
      this.findCategoryBySlugOrName(categorySlugOrName),
    ]);

    if (!foundCity)
      throw new BadRequestException(`City "${citySlugOrName}" not found.`);
    if (!foundCategory)
      throw new BadRequestException(
        `Category "${categorySlugOrName}" not found.`,
      );

    return { cityId: foundCity.id, categoryId: foundCategory.id };
  }

  private async findCityBySlugOrName(slugOrName: string) {
    const bySlug = await this.prisma.city.findFirst({
      where: {
        isActive: true,
        slug: { equals: slugOrName, mode: 'insensitive' },
      },
    });
    if (bySlug) return bySlug;
    return this.prisma.city.findFirst({
      where: {
        isActive: true,
        name: { equals: slugOrName, mode: 'insensitive' },
      },
    });
  }

  private async findCategoryBySlugOrName(slugOrName: string) {
    const bySlug = await this.prisma.category.findFirst({
      where: {
        isActive: true,
        slug: { equals: slugOrName, mode: 'insensitive' },
      },
    });
    if (bySlug) return bySlug;
    return this.prisma.category.findFirst({
      where: {
        isActive: true,
        name: { equals: slugOrName, mode: 'insensitive' },
      },
    });
  }

  private async generateSlug(
    tx: PrismaTransactionClient,
    firstName: string,
    lastName: string,
  ): Promise<string> {
    const { generateUniqueSlugWithDb } =
      await import('../../../shared/utils/slug.js');
    const fullName = `${firstName} ${lastName}`.trim();

    return generateUniqueSlugWithDb(fullName, async (prefix) => {
      const rows = await tx.master.findMany({
        where: { slug: { startsWith: prefix } },
        select: { slug: true },
      });
      return rows.map((m) => m.slug).filter((s): s is string => s != null);
    });
  }

  private async assembleResponse(
    user: User,
    master: Master | undefined,
    city?: string,
    category?: string,
  ) {
    const accessToken = this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(user.id);

    if (user.role === 'MASTER' && master) {
      return {
        message: 'Registration successful. Please wait for admin verification.',
        userId: user.id,
        masterId: master.id,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          masterProfile: {
            id: master.id,
            firstName: user.firstName,
            lastName: user.lastName,
            city,
            category,
          },
        },
      };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      },
      accessToken,
      refreshToken,
    };
  }

  async getRegistrationOptions() {
    const [cities, categories] = await Promise.all([
      this.prisma.city.findMany({
        where: { isActive: true },
        select: { name: true, slug: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.findMany({
        where: { isActive: true },
        select: { name: true, slug: true, icon: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    return {
      cities: cities.map((city) => ({
        name: city.name,
        slug: city.slug,
        value: city.slug,
      })),
      categories: categories.map((cat) => ({
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        value: cat.slug,
      })),
    };
  }
}
