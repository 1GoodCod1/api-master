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
exports.IdeasService = void 0;
const common_1 = require("@nestjs/common");
const ideas_query_service_1 = require("./services/ideas-query.service");
const ideas_actions_service_1 = require("./services/ideas-actions.service");
let IdeasService = class IdeasService {
    queryService;
    actionsService;
    constructor(queryService, actionsService) {
        this.queryService = queryService;
        this.actionsService = actionsService;
    }
    async findAll(queryDto) {
        return this.queryService.findAll(queryDto);
    }
    async findOne(id) {
        return this.queryService.findOne(id);
    }
    async create(userId, createIdeaDto) {
        return this.actionsService.create(userId, createIdeaDto);
    }
    async updateStatus(ideaId, updateDto) {
        return this.actionsService.updateStatus(ideaId, updateDto);
    }
    async toggleVote(ideaId, userId) {
        return this.actionsService.toggleVote(ideaId, userId);
    }
    async checkUserVoted(ideaId, userId) {
        return this.queryService.checkUserVoted(ideaId, userId);
    }
    async delete(ideaId, userId, userRole) {
        return this.actionsService.delete(ideaId, userId, userRole);
    }
};
exports.IdeasService = IdeasService;
exports.IdeasService = IdeasService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ideas_query_service_1.IdeasQueryService,
        ideas_actions_service_1.IdeasActionsService])
], IdeasService);
//# sourceMappingURL=ideas.service.js.map