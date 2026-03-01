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
exports.UpdateReportStatusDto = exports.ReportAction = exports.ReportStatus = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["PENDING"] = "PENDING";
    ReportStatus["REVIEWED"] = "REVIEWED";
    ReportStatus["RESOLVED"] = "RESOLVED";
    ReportStatus["REJECTED"] = "REJECTED";
})(ReportStatus || (exports.ReportStatus = ReportStatus = {}));
var ReportAction;
(function (ReportAction) {
    ReportAction["BAN_CLIENT"] = "BAN_CLIENT";
    ReportAction["BAN_MASTER"] = "BAN_MASTER";
    ReportAction["BAN_IP"] = "BAN_IP";
    ReportAction["WARNING_CLIENT"] = "WARNING_CLIENT";
    ReportAction["WARNING_MASTER"] = "WARNING_MASTER";
    ReportAction["NO_ACTION"] = "NO_ACTION";
})(ReportAction || (exports.ReportAction = ReportAction = {}));
class UpdateReportStatusDto {
    status;
    action;
    notes;
}
exports.UpdateReportStatusDto = UpdateReportStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ReportStatus }),
    (0, class_validator_1.IsEnum)(ReportStatus),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateReportStatusDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ReportAction, required: false }),
    (0, class_validator_1.IsEnum)(ReportAction),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateReportStatusDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateReportStatusDto.prototype, "notes", void 0);
//# sourceMappingURL=update-report-status.dto.js.map