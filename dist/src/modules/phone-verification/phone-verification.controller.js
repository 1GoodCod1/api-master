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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhoneVerificationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const phone_verification_service_1 = require("./phone-verification.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const get_user_decorator_1 = require("../../common/decorators/get-user.decorator");
const verify_code_dto_1 = require("./dto/verify-code.dto");
let PhoneVerificationController = class PhoneVerificationController {
    phoneVerificationService;
    constructor(phoneVerificationService) {
        this.phoneVerificationService = phoneVerificationService;
    }
    async sendCode(user) {
        return this.phoneVerificationService.sendVerificationCode(user.id);
    }
    async verify(user, dto) {
        return this.phoneVerificationService.verifyCode(user.id, dto.code);
    }
    async getStatus(user) {
        return this.phoneVerificationService.getVerificationStatus(user.id);
    }
};
exports.PhoneVerificationController = PhoneVerificationController;
__decorate([
    (0, common_1.Post)('send-code'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Send verification code to user phone' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Verification code sent successfully',
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PhoneVerificationController.prototype, "sendCode", null);
__decorate([
    (0, common_1.Post)('verify'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Verify phone with code' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Phone verified successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid code' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, verify_code_dto_1.VerifyCodeDto]),
    __metadata("design:returntype", Promise)
], PhoneVerificationController.prototype, "verify", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get phone verification status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Verification status retrieved' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PhoneVerificationController.prototype, "getStatus", null);
exports.PhoneVerificationController = PhoneVerificationController = __decorate([
    (0, swagger_1.ApiTags)('Phone Verification'),
    (0, common_1.Controller)('phone-verification'),
    __metadata("design:paramtypes", [phone_verification_service_1.PhoneVerificationService])
], PhoneVerificationController);
//# sourceMappingURL=phone-verification.controller.js.map