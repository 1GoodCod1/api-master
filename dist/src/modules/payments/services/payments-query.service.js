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
exports.PaymentsQueryService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
let PaymentsQueryService = class PaymentsQueryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPaymentsForMaster(masterId) {
        return this.prisma.payment.findMany({
            where: { masterId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getPaymentStats(masterId) {
        const [totalPayments, totalRevenue, recentPayments] = await Promise.all([
            this.prisma.payment.count({
                where: { masterId, status: constants_1.PaymentStatus.SUCCESS },
            }),
            this.prisma.payment.aggregate({
                where: { masterId, status: constants_1.PaymentStatus.SUCCESS },
                _sum: { amount: true },
            }),
            this.prisma.payment.findMany({
                where: { masterId },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
        ]);
        return {
            totalPayments,
            totalRevenue: totalRevenue._sum.amount || 0,
            recentPayments,
        };
    }
};
exports.PaymentsQueryService = PaymentsQueryService;
exports.PaymentsQueryService = PaymentsQueryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentsQueryService);
//# sourceMappingURL=payments-query.service.js.map