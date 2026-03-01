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
exports.VerificationService = void 0;
const common_1 = require("@nestjs/common");
const verification_query_service_1 = require("./services/verification-query.service");
const verification_action_service_1 = require("./services/verification-action.service");
let VerificationService = class VerificationService {
    queryService;
    actionService;
    constructor(queryService, actionService) {
        this.queryService = queryService;
        this.actionService = actionService;
    }
    async submitVerification(userId, dto) {
        return this.actionService.submit(userId, dto);
    }
    async getMyVerificationStatus(userId) {
        return this.queryService.getMyStatus(userId);
    }
    async getPendingVerifications(page = 1, limit = 20) {
        return this.queryService.getPendingRequests(page, limit);
    }
    async getVerificationStats() {
        const approvedCount = await this.queryService.getApprovedCount();
        const first100Limit = 100;
        return { approvedCount, first100Limit };
    }
    async getVerificationDetails(verificationId) {
        const [detail, approvedCount] = await Promise.all([
            this.queryService.getDetails(verificationId),
            this.queryService.getApprovedCount(),
        ]);
        const first100Limit = 100;
        const willReceivePremium = approvedCount < first100Limit;
        return {
            ...detail,
            approvedCount,
            first100Limit,
            willReceivePremium,
            nextSlotNumber: approvedCount + 1,
        };
    }
    async reviewVerification(verificationId, adminId, dto) {
        return this.actionService.review(verificationId, adminId, dto);
    }
};
exports.VerificationService = VerificationService;
exports.VerificationService = VerificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [verification_query_service_1.VerificationQueryService,
        verification_action_service_1.VerificationActionService])
], VerificationService);
//# sourceMappingURL=verification.service.js.map