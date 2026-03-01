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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhoneVerificationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../shared/database/prisma.service");
const encryption_service_1 = require("../shared/utils/encryption.service");
const cache_service_1 = require("../shared/cache/cache.service");
const twilio_1 = require("twilio");
let PhoneVerificationService = class PhoneVerificationService {
    prisma;
    encryption;
    configService;
    cache;
    twilioClient = null;
    constructor(prisma, encryption, configService, cache) {
        this.prisma = prisma;
        this.encryption = encryption;
        this.configService = configService;
        this.cache = cache;
        const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
        const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
        if (accountSid && authToken) {
            this.twilioClient = new twilio_1.Twilio(accountSid, authToken);
        }
    }
    async sendVerificationCode(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.phoneVerified) {
            throw new common_1.BadRequestException('Phone already verified');
        }
        const recentVerification = await this.prisma.phoneVerification.findFirst({
            where: {
                userId,
                createdAt: {
                    gte: new Date(Date.now() - 60000),
                },
            },
        });
        if (recentVerification) {
            throw new common_1.BadRequestException('Please wait before requesting a new code');
        }
        const code = this.encryption.generateCode(6);
        const expiresAt = new Date(Date.now() + 10 * 60000);
        await this.prisma.phoneVerification.create({
            data: {
                userId,
                phone: user.phone,
                code: this.encryption.hash(code),
                expiresAt,
            },
        });
        await this.sendSMS(user.phone, `Your verification code: ${code}. Valid for 10 minutes.`);
        return {
            message: 'Verification code sent',
            expiresAt,
        };
    }
    async verifyCode(userId, code) {
        if (!code || typeof code !== 'string') {
            throw new common_1.BadRequestException('Code is required');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.phoneVerified) {
            throw new common_1.BadRequestException('Phone already verified');
        }
        const verification = await this.prisma.phoneVerification.findFirst({
            where: {
                userId,
                verified: false,
                expiresAt: {
                    gt: new Date(),
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (!verification) {
            throw new common_1.BadRequestException('Verification code expired or not found');
        }
        if (verification.attempts >= 3) {
            throw new common_1.BadRequestException('Too many attempts. Please request a new code');
        }
        const hashedCode = this.encryption.hash(code);
        if (hashedCode !== verification.code) {
            await this.prisma.phoneVerification.update({
                where: { id: verification.id },
                data: {
                    attempts: {
                        increment: 1,
                    },
                },
            });
            throw new common_1.BadRequestException('Invalid verification code');
        }
        const updateData = {
            phoneVerified: true,
            phoneVerifiedAt: new Date(),
            ...(user.role === 'CLIENT' && { isVerified: true }),
        };
        await this.prisma.$transaction([
            this.prisma.phoneVerification.update({
                where: { id: verification.id },
                data: {
                    verified: true,
                    verifiedAt: new Date(),
                },
            }),
            this.prisma.user.update({
                where: { id: userId },
                data: updateData,
            }),
        ]);
        await this.cache.del(this.cache.keys.userMasterProfile(userId));
        await this.cache.del(this.cache.keys.userProfile(userId));
        return {
            message: 'Phone verified successfully',
        };
    }
    async sendSMS(phone, message) {
        if (this.configService.get('NODE_ENV') === 'development') {
            console.log(`[SMS] To: ${phone}, Message: ${message}`);
            return;
        }
        if (!this.twilioClient) {
            console.warn('Twilio not configured. SMS not sent.');
            return;
        }
        try {
            const from = this.configService.get('TWILIO_PHONE_NUMBER');
            await this.twilioClient.messages.create({
                body: message,
                from,
                to: phone,
            });
        }
        catch (error) {
            console.error('Failed to send SMS:', error);
            throw new common_1.BadRequestException('Failed to send SMS');
        }
    }
    async getVerificationStatus(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                phoneVerified: true,
                phoneVerifiedAt: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
};
exports.PhoneVerificationService = PhoneVerificationService;
exports.PhoneVerificationService = PhoneVerificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService,
        config_1.ConfigService,
        cache_service_1.CacheService])
], PhoneVerificationService);
//# sourceMappingURL=phone-verification.service.js.map