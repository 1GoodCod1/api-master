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
exports.MasterAnalyticsResponseDto = exports.DailyAnalyticsItemDto = exports.AnalyticsSummaryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class AnalyticsSummaryDto {
    totalLeads;
    totalViews;
    totalReviews;
    avgRating;
    totalRevenue;
}
exports.AnalyticsSummaryDto = AnalyticsSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], AnalyticsSummaryDto.prototype, "totalLeads", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], AnalyticsSummaryDto.prototype, "totalViews", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], AnalyticsSummaryDto.prototype, "totalReviews", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], AnalyticsSummaryDto.prototype, "avgRating", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], AnalyticsSummaryDto.prototype, "totalRevenue", void 0);
class DailyAnalyticsItemDto {
    date;
    leadsCount;
    viewsCount;
    reviewsCount;
    rating;
    revenue;
}
exports.DailyAnalyticsItemDto = DailyAnalyticsItemDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DailyAnalyticsItemDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DailyAnalyticsItemDto.prototype, "leadsCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DailyAnalyticsItemDto.prototype, "viewsCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DailyAnalyticsItemDto.prototype, "reviewsCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DailyAnalyticsItemDto.prototype, "rating", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DailyAnalyticsItemDto.prototype, "revenue", void 0);
class MasterAnalyticsResponseDto {
    period;
    data;
    summary;
}
exports.MasterAnalyticsResponseDto = MasterAnalyticsResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MasterAnalyticsResponseDto.prototype, "period", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [DailyAnalyticsItemDto] }),
    __metadata("design:type", Array)
], MasterAnalyticsResponseDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: AnalyticsSummaryDto }),
    __metadata("design:type", AnalyticsSummaryDto)
], MasterAnalyticsResponseDto.prototype, "summary", void 0);
//# sourceMappingURL=analytics-response.dto.js.map