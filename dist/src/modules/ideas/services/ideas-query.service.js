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
exports.IdeasQueryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const query_ideas_dto_1 = require("../dto/query-ideas.dto");
let IdeasQueryService = class IdeasQueryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(queryDto) {
        const { status, sortBy, page = 1, limit = 20 } = queryDto;
        const skip = (page - 1) * limit;
        const where = {};
        if (status && status !== query_ideas_dto_1.IdeaStatusFilter.ALL) {
            where.status = status;
        }
        let orderBy = {};
        switch (sortBy) {
            case query_ideas_dto_1.IdeaSortBy.VOTES:
                orderBy = { votesCount: 'desc' };
                break;
            case query_ideas_dto_1.IdeaSortBy.CREATED_AT:
                orderBy = { createdAt: 'desc' };
                break;
            case query_ideas_dto_1.IdeaSortBy.UPDATED_AT:
                orderBy = { updatedAt: 'desc' };
                break;
            default:
                orderBy = { votesCount: 'desc' };
        }
        const [ideas, total] = await Promise.all([
            this.prisma.idea.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: {
                    author: {
                        select: {
                            id: true,
                            email: true,
                            role: true,
                            firstName: true,
                            lastName: true,
                            masterProfile: {
                                select: {
                                    id: true,
                                },
                            },
                        },
                    },
                    votes: {
                        select: {
                            userId: true,
                        },
                    },
                },
            }),
            this.prisma.idea.count({ where }),
        ]);
        return {
            ideas,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        return this.prisma.idea.findUnique({
            where: { id },
            include: {
                author: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        firstName: true,
                        lastName: true,
                        masterProfile: {
                            select: {
                                id: true,
                            },
                        },
                    },
                },
                votes: {
                    select: {
                        userId: true,
                        createdAt: true,
                    },
                },
            },
        });
    }
    async checkUserVoted(ideaId, userId) {
        const vote = await this.prisma.ideaVote.findUnique({
            where: {
                ideaId_userId: {
                    ideaId,
                    userId,
                },
            },
        });
        return !!vote;
    }
};
exports.IdeasQueryService = IdeasQueryService;
exports.IdeasQueryService = IdeasQueryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IdeasQueryService);
//# sourceMappingURL=ideas-query.service.js.map