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
exports.CreateMasterDto = exports.MasterServiceDto = exports.MasterServiceCurrency = exports.MasterServicePriceType = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const sanitize_html_util_1 = require("../../shared/utils/sanitize-html.util");
var MasterServicePriceType;
(function (MasterServicePriceType) {
    MasterServicePriceType["FIXED"] = "FIXED";
    MasterServicePriceType["NEGOTIABLE"] = "NEGOTIABLE";
})(MasterServicePriceType || (exports.MasterServicePriceType = MasterServicePriceType = {}));
var MasterServiceCurrency;
(function (MasterServiceCurrency) {
    MasterServiceCurrency["MDL"] = "MDL";
    MasterServiceCurrency["EUR"] = "EUR";
    MasterServiceCurrency["USD"] = "USD";
})(MasterServiceCurrency || (exports.MasterServiceCurrency = MasterServiceCurrency = {}));
class MasterServiceDto {
    title;
    priceType;
    price;
    currency;
}
exports.MasterServiceDto = MasterServiceDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(120),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? (0, sanitize_html_util_1.sanitizeStrict)(value) : value),
    __metadata("design:type", String)
], MasterServiceDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: MasterServicePriceType }),
    (0, class_validator_1.IsEnum)(MasterServicePriceType),
    __metadata("design:type", String)
], MasterServiceDto.prototype, "priceType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.ValidateIf)((o) => o.priceType === MasterServicePriceType.FIXED),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], MasterServiceDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, enum: MasterServiceCurrency }),
    (0, class_validator_1.ValidateIf)((o) => o.priceType === MasterServicePriceType.FIXED),
    (0, class_validator_1.IsIn)(Object.values(MasterServiceCurrency)),
    __metadata("design:type", String)
], MasterServiceDto.prototype, "currency", void 0);
class CreateMasterDto {
    description;
    avatar;
    cityId;
    categoryId;
    experienceYears;
    services;
    latitude;
    longitude;
}
exports.CreateMasterDto = CreateMasterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? (0, sanitize_html_util_1.sanitizeStrict)(value) : value),
    __metadata("design:type", String)
], CreateMasterDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateMasterDto.prototype, "avatar", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateMasterDto.prototype, "cityId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateMasterDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(50),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateMasterDto.prototype, "experienceYears", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: [MasterServiceDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => MasterServiceDto),
    __metadata("design:type", Array)
], CreateMasterDto.prototype, "services", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Latitude for map marker' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-90),
    (0, class_validator_1.Max)(90),
    __metadata("design:type", Number)
], CreateMasterDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Longitude for map marker' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-180),
    (0, class_validator_1.Max)(180),
    __metadata("design:type", Number)
], CreateMasterDto.prototype, "longitude", void 0);
//# sourceMappingURL=create-master.dto.js.map