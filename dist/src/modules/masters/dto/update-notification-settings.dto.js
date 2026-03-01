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
exports.UpdateNotificationSettingsDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpdateNotificationSettingsDto {
    telegramChatId;
    whatsappPhone;
}
exports.UpdateNotificationSettingsDto = UpdateNotificationSettingsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        description: 'Telegram chat_id для уведомлений о заявках',
    }),
    (0, class_validator_1.ValidateIf)((_, v) => v != null && v !== ''),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^-?\d+$/, {
        message: 'telegramChatId must be a numeric string (e.g. from @userinfobot)',
    }),
    __metadata("design:type", Object)
], UpdateNotificationSettingsDto.prototype, "telegramChatId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        description: 'WhatsApp номер в международном формате (e.g. +37369123456)',
    }),
    (0, class_validator_1.ValidateIf)((_, v) => v != null && v !== ''),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+?[0-9]{10,15}$/, {
        message: 'whatsappPhone must be international format (e.g. +37369123456)',
    }),
    __metadata("design:type", Object)
], UpdateNotificationSettingsDto.prototype, "whatsappPhone", void 0);
//# sourceMappingURL=update-notification-settings.dto.js.map