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
exports.UpdateIdeaStatusDto = exports.IdeaStatus = void 0;
const class_validator_1 = require("class-validator");
var IdeaStatus;
(function (IdeaStatus) {
    IdeaStatus["PENDING"] = "PENDING";
    IdeaStatus["APPROVED"] = "APPROVED";
    IdeaStatus["REJECTED"] = "REJECTED";
    IdeaStatus["IMPLEMENTED"] = "IMPLEMENTED";
})(IdeaStatus || (exports.IdeaStatus = IdeaStatus = {}));
class UpdateIdeaStatusDto {
    status;
    adminNote;
}
exports.UpdateIdeaStatusDto = UpdateIdeaStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(IdeaStatus),
    __metadata("design:type", String)
], UpdateIdeaStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, {
        message: 'Заметка админа не должна превышать 500 символов',
    }),
    __metadata("design:type", String)
], UpdateIdeaStatusDto.prototype, "adminNote", void 0);
//# sourceMappingURL=update-idea-status.dto.js.map