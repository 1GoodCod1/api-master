"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var VerificationActionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationActionService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
const cache_service_1 = require("../../shared/cache/cache.service");
const in_app_notification_service_1 = require("../../notifications/services/in-app-notification.service");
const review_verification_dto_1 = require("../dto/review-verification.dto");
let VerificationActionService = VerificationActionService_1 = class VerificationActionService {
    prisma;
    cache;
    inAppNotifications;
    logger = new common_1.Logger(VerificationActionService_1.name);
    constructor(prisma, cache, inAppNotifications) {
        this.prisma = prisma;
        this.cache = cache;
        this.inAppNotifications = inAppNotifications;
    }
    async submit(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { masterProfile: true },
        });
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        if (user.role !== 'MASTER')
            throw new common_1.BadRequestException('Только мастера могут подавать заявку на верификацию');
        if (!user.masterProfile)
            throw new common_1.NotFoundException('Профиль мастера не найден');
        if (dto.phone !== user.phone)
            throw new common_1.BadRequestException('Номер телефона должен совпадать с номером в профиле');
        const existingVerification = await this.prisma.masterVerification.findUnique({
            where: { masterId: user.masterProfile.id },
        });
        if (existingVerification &&
            existingVerification.status === constants_1.VerificationStatus.PENDING) {
            throw new common_1.BadRequestException('Заявка на верификацию уже подана и ожидает рассмотрения');
        }
        const verification = await this.prisma.masterVerification.upsert({
            where: { masterId: user.masterProfile.id },
            create: {
                masterId: user.masterProfile.id,
                documentType: dto.documentType,
                documentNumber: dto.documentNumber,
                documentFrontId: dto.documentFrontId,
                documentBackId: dto.documentBackId,
                selfieId: dto.selfieId,
                phone: dto.phone,
                phoneVerified: user.phoneVerified,
                status: constants_1.VerificationStatus.PENDING,
            },
            update: {
                documentType: dto.documentType,
                documentNumber: dto.documentNumber,
                documentFrontId: dto.documentFrontId,
                documentBackId: dto.documentBackId,
                selfieId: dto.selfieId,
                phone: dto.phone,
                phoneVerified: user.phoneVerified,
                status: constants_1.VerificationStatus.PENDING,
                submittedAt: new Date(),
                reviewedBy: null,
                reviewedAt: null,
                notes: null,
            },
        });
        await this.prisma.master.update({
            where: { id: user.masterProfile.id },
            data: {
                pendingVerification: true,
                verificationSubmittedAt: new Date(),
            },
        });
        const masterName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
            user.phone;
        await this.inAppNotifications
            .notifyNewVerificationRequest({
            verificationId: verification.id,
            masterId: user.masterProfile.id,
            masterName,
        })
            .catch((e) => {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(`Failed to send in-app new verification notification: ${msg}`);
        });
        return {
            message: 'Заявка на верификацию успешно отправлена',
            verificationId: verification.id,
        };
    }
    async review(verificationId, adminId, dto) {
        const verification = await this.prisma.masterVerification.findUnique({
            where: { id: verificationId },
            include: { master: true },
        });
        if (!verification)
            throw new common_1.NotFoundException('Заявка не найдена');
        if (verification.status !== constants_1.VerificationStatus.PENDING)
            throw new common_1.BadRequestException('Заявка уже была обработана');
        const status = dto.decision === review_verification_dto_1.VerificationDecision.APPROVE
            ? constants_1.VerificationStatus.APPROVED
            : constants_1.VerificationStatus.REJECTED;
        await this.prisma.masterVerification.update({
            where: { id: verificationId },
            data: {
                status,
                reviewedBy: adminId,
                reviewedAt: new Date(),
                notes: dto.notes || null,
            },
        });
        if (dto.decision === review_verification_dto_1.VerificationDecision.APPROVE) {
            const userId = verification.master.userId;
            await this.prisma.$transaction([
                this.prisma.master.update({
                    where: { id: verification.masterId },
                    data: { pendingVerification: false },
                }),
                this.prisma.user.update({
                    where: { id: userId },
                    data: { isVerified: true },
                }),
            ]);
            await this.invalidateCache(userId);
            await this.inAppNotifications
                .notifyVerificationApproved(userId, {
                verificationId,
                masterId: verification.masterId,
                isFirst100: false,
            })
                .catch((e) => {
                const msg = e instanceof Error ? e.message : String(e);
                this.logger.warn(`Failed to send in-app verification approved: ${msg}`);
            });
        }
        else {
            await this.prisma.master.update({
                where: { id: verification.masterId },
                data: { pendingVerification: false },
            });
            const userId = verification.master.userId;
            await this.inAppNotifications
                .notifyVerificationRejected(userId, {
                verificationId,
                masterId: verification.masterId,
                reason: dto.notes || undefined,
            })
                .catch((e) => {
                const msg = e instanceof Error ? e.message : String(e);
                this.logger.warn(`Failed to send in-app verification rejected: ${msg}`);
            });
        }
        return {
            message: `Заявка ${dto.decision === review_verification_dto_1.VerificationDecision.APPROVE ? 'одобрена' : 'отклонена'} успешно`,
        };
    }
    async invalidateCache(userId) {
        await this.cache.del(this.cache.keys.userMasterProfile(userId));
        await this.cache.del(this.cache.keys.userProfile(userId));
    }
};
exports.VerificationActionService = VerificationActionService;
exports.VerificationActionService = VerificationActionService = VerificationActionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        in_app_notification_service_1.InAppNotificationService])
], VerificationActionService);
//# sourceMappingURL=verification-action.service.js.map