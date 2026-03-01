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
exports.CreateReviewDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const review_criteria_dto_1 = require("./review-criteria.dto");
const sanitize_html_util_1 = require("../../shared/utils/sanitize-html.util");
class CreateReviewDto {
    masterId;
    clientPhone;
    clientName;
    rating;
    comment;
    criteria;
    fileIds;
}
exports.CreateReviewDto = CreateReviewDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateReviewDto.prototype, "masterId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '+37360000000',
        required: false,
        description: 'Optional for authenticated CLIENT (uses user.phone)',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^(\+373|0)\d{8}$/),
    __metadata("design:type", String)
], CreateReviewDto.prototype, "clientPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? (0, sanitize_html_util_1.sanitizeStrict)(value) : undefined),
    __metadata("design:type", String)
], CreateReviewDto.prototype, "clientName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ minimum: 1, maximum: 5 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], CreateReviewDto.prototype, "rating", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, maxLength: 200 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? (0, sanitize_html_util_1.sanitizeStrict)(value) : undefined),
    __metadata("design:type", String)
], CreateReviewDto.prototype, "comment", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        description: 'Detailed criteria ratings',
        type: [review_criteria_dto_1.ReviewCriteriaDto],
        example: [
            { criteria: 'quality', rating: 5 },
            { criteria: 'speed', rating: 4 },
            { criteria: 'price', rating: 3 },
            { criteria: 'politeness', rating: 5 },
        ],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => review_criteria_dto_1.ReviewCriteriaDto),
    __metadata("design:type", Array)
], CreateReviewDto.prototype, "criteria", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        description: 'Photo file IDs for review (max 5)',
        type: [String],
        maxItems: 5,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(5),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateReviewDto.prototype, "fileIds", void 0);
//# sourceMappingURL=create-review.dto.js.map