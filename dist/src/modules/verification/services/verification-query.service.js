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
exports.VerificationQueryService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
let VerificationQueryService = class VerificationQueryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMyStatus(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                masterProfile: {
                    include: {
                        verification: {
                            include: {
                                documentFront: true,
                                documentBack: true,
                                selfie: true,
                            },
                        },
                    },
                },
            },
        });
        if (!user || !user.masterProfile) {
            throw new common_1.NotFoundException('Профиль мастера не найден');
        }
        return {
            isVerified: user.isVerified,
            pendingVerification: user.masterProfile.pendingVerification,
            verification: user.masterProfile.verification,
        };
    }
    async getPendingRequests(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [verifications, total] = await Promise.all([
            this.prisma.masterVerification.findMany({
                where: { status: constants_1.VerificationStatus.PENDING },
                include: {
                    master: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    phone: true,
                                    phoneVerified: true,
                                },
                            },
                        },
                    },
                    documentFront: true,
                    documentBack: true,
                    selfie: true,
                },
                orderBy: { submittedAt: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.masterVerification.count({
                where: { status: constants_1.VerificationStatus.PENDING },
            }),
        ]);
        return {
            verifications,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getDetails(verificationId) {
        const verification = await this.prisma.masterVerification.findUnique({
            where: { id: verificationId },
            include: {
                master: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                phone: true,
                                phoneVerified: true,
                                createdAt: true,
                            },
                        },
                        city: true,
                        category: true,
                    },
                },
                documentFront: true,
                documentBack: true,
                selfie: true,
            },
        });
        if (!verification) {
            throw new common_1.NotFoundException('Заявка на верификацию не найдена');
        }
        return verification;
    }
    async getApprovedCount() {
        return this.prisma.masterVerification.count({
            where: { status: constants_1.VerificationStatus.APPROVED },
        });
    }
};
exports.VerificationQueryService = VerificationQueryService;
exports.VerificationQueryService = VerificationQueryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VerificationQueryService);
//# sourceMappingURL=verification-query.service.js.map