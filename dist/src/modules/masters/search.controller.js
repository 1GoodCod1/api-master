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
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const masters_service_1 = require("./masters.service");
let SearchController = class SearchController {
    mastersService;
    constructor(mastersService) {
        this.mastersService = mastersService;
    }
    async searchMasters(categoryId, cityId, minRating, minExperience) {
        const searchDto = {
            categoryId,
            cityId,
            minRating: minRating ? Number(minRating) : undefined,
            minExperience: minExperience ? Number(minExperience) : undefined,
            page: 1,
            limit: 20,
            sortBy: 'rating',
            sortOrder: 'desc',
        };
        return this.mastersService.findAll(searchDto);
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Get)('masters'),
    (0, swagger_1.ApiOperation)({ summary: 'Simple master search with filters' }),
    (0, swagger_1.ApiQuery)({ name: 'category', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'city', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'rating', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'experience', required: false, type: Number }),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('city')),
    __param(2, (0, common_1.Query)('rating')),
    __param(3, (0, common_1.Query)('experience')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "searchMasters", null);
exports.SearchController = SearchController = __decorate([
    (0, swagger_1.ApiTags)('Search'),
    (0, common_1.Controller)('search'),
    __metadata("design:paramtypes", [masters_service_1.MastersService])
], SearchController);
//# sourceMappingURL=search.controller.js.map