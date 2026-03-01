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
exports.IdeasController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const swagger_1 = require("@nestjs/swagger");
const ideas_service_1 = require("./ideas.service");
const create_idea_dto_1 = require("./dto/create-idea.dto");
const update_idea_status_dto_1 = require("./dto/update-idea-status.dto");
const query_ideas_dto_1 = require("./dto/query-ideas.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const optional_jwt_auth_guard_1 = require("../../common/guards/optional-jwt-auth.guard");
let IdeasController = class IdeasController {
    ideasService;
    constructor(ideasService) {
        this.ideasService = ideasService;
    }
    async findAll(queryDto, req) {
        const result = await this.ideasService.findAll(queryDto);
        const userId = req.user?.id;
        if (userId) {
            const ideasWithVoteStatus = await Promise.all(result.ideas.map(async (idea) => {
                const hasVoted = await this.ideasService.checkUserVoted(idea.id, userId);
                return {
                    ...idea,
                    hasVoted,
                };
            }));
            return {
                ...result,
                ideas: ideasWithVoteStatus,
            };
        }
        return result;
    }
    async findOne(id, req) {
        const idea = await this.ideasService.findOne(id);
        if (req.user?.id) {
            const hasVoted = await this.ideasService.checkUserVoted(id, req.user.id);
            return {
                ...idea,
                hasVoted,
            };
        }
        return idea;
    }
    async create(createIdeaDto, req) {
        return this.ideasService.create(req.user.id, createIdeaDto);
    }
    async updateStatus(id, updateDto) {
        return this.ideasService.updateStatus(id, updateDto);
    }
    async toggleVote(id, req) {
        return this.ideasService.toggleVote(id, req.user.id);
    }
    async delete(id, req) {
        return this.ideasService.delete(id, req.user.id, req.user.role);
    }
};
exports.IdeasController = IdeasController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all ideas',
        description: 'Get list of ideas with filters and pagination. Public endpoint.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Ideas retrieved successfully' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_ideas_dto_1.QueryIdeasDto, Object]),
    __metadata("design:returntype", Promise)
], IdeasController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Get idea by ID',
        description: 'Get single idea details. Public endpoint.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Idea retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Idea not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IdeasController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 3600000 } }),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Create new idea',
        description: 'Authenticated users can submit ideas for improvement.',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Idea created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_idea_dto_1.CreateIdeaDto, Object]),
    __metadata("design:returntype", Promise)
], IdeasController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Update idea status (Admin only)',
        description: 'Admin can approve, reject, or mark ideas as implemented.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Idea status updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Admin only' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Idea not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_idea_status_dto_1.UpdateIdeaStatusDto]),
    __metadata("design:returntype", Promise)
], IdeasController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/vote'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Toggle vote for idea',
        description: 'Users can vote or unvote for approved ideas.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Vote toggled successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Can only vote for approved ideas' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Idea not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IdeasController.prototype, "toggleVote", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete idea',
        description: 'Author or admin can delete an idea.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Idea deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Idea not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IdeasController.prototype, "delete", null);
exports.IdeasController = IdeasController = __decorate([
    (0, swagger_1.ApiTags)('Ideas'),
    (0, common_1.Controller)('ideas'),
    __metadata("design:paramtypes", [ideas_service_1.IdeasService])
], IdeasController);
//# sourceMappingURL=ideas.controller.js.map