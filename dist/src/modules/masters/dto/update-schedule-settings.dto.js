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
exports.UpdateScheduleSettingsDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateScheduleSettingsDto {
    workStartHour;
    workEndHour;
    slotDurationMinutes;
}
exports.UpdateScheduleSettingsDto = UpdateScheduleSettingsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Work day start hour (0-23)',
        example: 9,
        minimum: 0,
        maximum: 23,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(23),
    __metadata("design:type", Number)
], UpdateScheduleSettingsDto.prototype, "workStartHour", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Work day end hour (1-24)',
        example: 18,
        minimum: 1,
        maximum: 24,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(24),
    __metadata("design:type", Number)
], UpdateScheduleSettingsDto.prototype, "workEndHour", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Slot duration in minutes (15, 30, 45, 60, 90, 120)',
        example: 60,
        minimum: 15,
        maximum: 120,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(15),
    (0, class_validator_1.Max)(120),
    __metadata("design:type", Number)
], UpdateScheduleSettingsDto.prototype, "slotDurationMinutes", void 0);
//# sourceMappingURL=update-schedule-settings.dto.js.map