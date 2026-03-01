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
exports.QueryIdeasDto = exports.IdeaSortBy = exports.IdeaStatusFilter = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var IdeaStatusFilter;
(function (IdeaStatusFilter) {
    IdeaStatusFilter["ALL"] = "ALL";
    IdeaStatusFilter["PENDING"] = "PENDING";
    IdeaStatusFilter["APPROVED"] = "APPROVED";
    IdeaStatusFilter["REJECTED"] = "REJECTED";
    IdeaStatusFilter["IMPLEMENTED"] = "IMPLEMENTED";
})(IdeaStatusFilter || (exports.IdeaStatusFilter = IdeaStatusFilter = {}));
var IdeaSortBy;
(function (IdeaSortBy) {
    IdeaSortBy["VOTES"] = "VOTES";
    IdeaSortBy["CREATED_AT"] = "CREATED_AT";
    IdeaSortBy["UPDATED_AT"] = "UPDATED_AT";
})(IdeaSortBy || (exports.IdeaSortBy = IdeaSortBy = {}));
class QueryIdeasDto {
    status = IdeaStatusFilter.ALL;
    sortBy = IdeaSortBy.VOTES;
    page = 1;
    limit = 20;
}
exports.QueryIdeasDto = QueryIdeasDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(IdeaStatusFilter),
    __metadata("design:type", String)
], QueryIdeasDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(IdeaSortBy),
    __metadata("design:type", String)
], QueryIdeasDto.prototype, "sortBy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], QueryIdeasDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], QueryIdeasDto.prototype, "limit", void 0);
//# sourceMappingURL=query-ideas.dto.js.map