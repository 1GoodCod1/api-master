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
exports.CreateLeadDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const sanitize_html_util_1 = require("../../shared/utils/sanitize-html.util");
class CreateLeadDto {
    masterId;
    clientPhone;
    clientName;
    message;
    fileIds;
    premiumPaymentSessionId;
    recaptchaToken;
}
exports.CreateLeadDto = CreateLeadDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLeadDto.prototype, "masterId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '+37360000000',
        required: false,
        description: 'Deprecated: client phone is now taken from authenticated client profile',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLeadDto.prototype, "clientPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? (0, sanitize_html_util_1.sanitizeStrict)(value) : value),
    __metadata("design:type", String)
], CreateLeadDto.prototype, "clientName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(300),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? (0, sanitize_html_util_1.sanitizeStrict)(value) : value),
    __metadata("design:type", String)
], CreateLeadDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: [String], maxItems: 10 }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(10),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateLeadDto.prototype, "fileIds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        description: 'Premium lead payment session ID',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLeadDto.prototype, "premiumPaymentSessionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        description: 'reCAPTCHA token for bot protection',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLeadDto.prototype, "recaptchaToken", void 0);
//# sourceMappingURL=create-lead.dto.js.map