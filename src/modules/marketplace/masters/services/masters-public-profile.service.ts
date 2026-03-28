import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { RequestWithOptionalUser } from '../../../../common/decorators';
import { ActivityEvent } from '../../../engagement/recommendations/events/activity.events';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { decodeId } from '../../../shared/utils/id-encoder';
import { getStartOfTodayInMoldova } from '../../../shared/utils/timezone.util';
import { MastersProfileService } from './masters-profile.service';
import { UserRole } from '@prisma/client';

/**
 * Публичный профиль мастера с трекингом просмотров.
 * Оркестрирует MastersProfileService и логику инкремента просмотров.
 */
@Injectable()
export class MastersPublicProfileService {
  private readonly logger = new Logger(MastersPublicProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly profileService: MastersProfileService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Публичный профиль мастера по slug или encodedId.
   * Поддерживает инкремент просмотров с учётом сессии/IP.
   */
  async findOne(
    slugOrId: string,
    req: RequestWithOptionalUser,
    incrementViews = false,
  ): Promise<unknown> {
    const identifier = decodeId(slugOrId) || slugOrId;
    const { userId, sessionId, ipAddress, userAgent } =
      this.extractRequestContext(req);
    const onViewIncrement = (
      masterId: string,
      uid?: string,
      sid?: string,
      ip?: string,
      ua?: string,
      catId?: string,
      cityId?: string,
    ) =>
      this.handleViewIncrement(
        masterId,
        uid,
        sid,
        ip,
        ua,
        catId,
        cityId,
        req.user?.role,
      );

    return this.profileService.findOne(
      identifier,
      incrementViews,
      userId,
      sessionId,
      ipAddress,
      userAgent,
      undefined,
      undefined,
      onViewIncrement,
    );
  }

  private extractRequestContext(req: RequestWithOptionalUser) {
    const reqWithSession = req as RequestWithOptionalUser & {
      sessionID?: string;
    };
    return {
      userId: req.user?.id,
      sessionId:
        reqWithSession.sessionID ||
        (req.headers['x-session-id'] as string | undefined),
      ipAddress:
        req.ip ||
        (req.headers['x-forwarded-for'] as string | undefined) ||
        req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
  }

  /**
   * Обработка инкремента просмотров с отслеживанием активности.
   * Учитываются просмотры от клиентов (role=CLIENT) и анонимных посетителей:
   * - исключены владелец профиля и другие мастера;
   * - 1 запись на посетителя в день (дедупликация по userId / sessionId / IP).
   */
  private async handleViewIncrement(
    masterId: string,
    userId?: string,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string,
    categoryId?: string,
    cityId?: string,
    userRole?: string,
  ) {
    // Мастера не считаем (ни свой профиль, ни чужие)
    if (userRole === UserRole.MASTER) return;

    const todayStart = getStartOfTodayInMoldova();

    // Для авторизованных пользователей: проверяем, не мастер ли он и не свой ли профиль
    if (userId) {
      const viewerCacheKey = `cache:viewer:${userId}:is-master`;
      let viewerIsMaster = await this.cache.get<boolean>(viewerCacheKey);

      if (viewerIsMaster === null) {
        const [profileMaster, viewerMaster] = await Promise.all([
          this.prisma.master.findUnique({
            where: { id: masterId },
            select: { userId: true },
          }),
          this.prisma.master.findUnique({
            where: { userId },
            select: { id: true },
          }),
        ]);
        if (profileMaster?.userId === userId) return;
        viewerIsMaster = !!viewerMaster;
        await this.cache.set(viewerCacheKey, viewerIsMaster, 60);
      }

      if (viewerIsMaster) return;
    }

    // Дедупликация: 1 просмотр на посетителя в день (по userId, sessionId или IP)
    const viewerIdent = userId
      ? { userId }
      : sessionId
        ? { sessionId }
        : ipAddress
          ? { ipAddress }
          : null;
    if (viewerIdent) {
      const alreadyViewedToday = await this.prisma.userActivity.findFirst({
        where: {
          masterId,
          action: 'view',
          createdAt: { gte: todayStart },
          ...viewerIdent,
        },
      });
      if (alreadyViewedToday) return;
    }

    await this.prisma.master.update({
      where: { id: masterId },
      data: { views: { increment: 1 } },
    });

    this.eventEmitter.emit(ActivityEvent.TRACKED, {
      userId,
      sessionId,
      action: 'view',
      masterId,
      categoryId,
      cityId,
      ipAddress,
      userAgent,
    });
  }
}
