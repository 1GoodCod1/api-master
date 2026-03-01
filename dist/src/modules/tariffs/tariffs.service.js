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
exports.TariffsService = void 0;
const common_1 = require("@nestjs/common");
const tariffs_query_service_1 = require("./services/tariffs-query.service");
const tariffs_action_service_1 = require("./services/tariffs-action.service");
let TariffsService = class TariffsService {
    queryService;
    actionService;
    constructor(queryService, actionService) {
        this.queryService = queryService;
        this.actionService = actionService;
    }
    async findAll(filters = {}) {
        return this.queryService.findAll(filters);
    }
    async findOne(id) {
        return this.queryService.findOne(id);
    }
    async findByType(type) {
        return this.queryService.findByType(type);
    }
    async create(createTariffDto) {
        return this.actionService.create(createTariffDto);
    }
    async update(id, updateTariffDto) {
        return this.actionService.update(id, updateTariffDto);
    }
    async remove(id) {
        return this.actionService.remove(id);
    }
    async getActiveTariffs() {
        return this.queryService.getActiveTariffs();
    }
};
exports.TariffsService = TariffsService;
exports.TariffsService = TariffsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tariffs_query_service_1.TariffsQueryService,
        tariffs_action_service_1.TariffsActionService])
], TariffsService);
//# sourceMappingURL=tariffs.service.js.map