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
exports.IdeasActionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const update_idea_status_dto_1 = require("../dto/update-idea-status.dto");
let IdeasActionsService = class IdeasActionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, createIdeaDto) {
        const { title, description } = createIdeaDto;
        const existingIdea = await this.prisma.idea.findFirst({
            where: {
                title: {
                    contains: title,
                    mode: 'insensitive',
                },
                authorId: userId,
            },
        });
        if (existingIdea) {
            throw new common_1.BadRequestException('У вас уже есть идея с похожим названием');
        }
        return this.prisma.idea.create({
            data: {
                title,
                description,
                authorId: userId,
            },
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
            },
        });
    }
    async updateStatus(ideaId, updateDto) {
        const idea = await this.prisma.idea.findUnique({
            where: { id: ideaId },
        });
        if (!idea) {
            throw new common_1.NotFoundException('Идея не найдена');
        }
        const updateData = {
            status: updateDto.status,
            adminNote: updateDto.adminNote,
        };
        switch (updateDto.status) {
            case update_idea_status_dto_1.IdeaStatus.APPROVED:
                updateData.approvedAt = new Date();
                break;
            case update_idea_status_dto_1.IdeaStatus.REJECTED:
                updateData.rejectedAt = new Date();
                break;
            case update_idea_status_dto_1.IdeaStatus.IMPLEMENTED:
                updateData.implementedAt = new Date();
                break;
        }
        return this.prisma.idea.update({
            where: { id: ideaId },
            data: updateData,
            include: {
                author: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    async toggleVote(ideaId, userId) {
        const idea = await this.prisma.idea.findUnique({
            where: { id: ideaId },
        });
        if (!idea) {
            throw new common_1.NotFoundException('Идея не найдена');
        }
        if (idea.status !== 'APPROVED') {
            throw new common_1.ForbiddenException('Можно голосовать только за одобренные идеи');
        }
        const existingVote = await this.prisma.ideaVote.findUnique({
            where: {
                ideaId_userId: {
                    ideaId,
                    userId,
                },
            },
        });
        if (existingVote) {
            await this.prisma.$transaction([
                this.prisma.ideaVote.delete({
                    where: { id: existingVote.id },
                }),
                this.prisma.idea.update({
                    where: { id: ideaId },
                    data: {
                        votesCount: {
                            decrement: 1,
                        },
                    },
                }),
            ]);
            return { voted: false };
        }
        else {
            await this.prisma.$transaction([
                this.prisma.ideaVote.create({
                    data: {
                        ideaId,
                        userId,
                    },
                }),
                this.prisma.idea.update({
                    where: { id: ideaId },
                    data: {
                        votesCount: {
                            increment: 1,
                        },
                    },
                }),
            ]);
            return { voted: true };
        }
    }
    async delete(ideaId, userId, userRole) {
        const idea = await this.prisma.idea.findUnique({
            where: { id: ideaId },
        });
        if (!idea) {
            throw new common_1.NotFoundException('Идея не найдена');
        }
        if (idea.authorId !== userId && userRole !== 'ADMIN') {
            throw new common_1.ForbiddenException('Вы не можете удалить эту идею');
        }
        return this.prisma.idea.delete({
            where: { id: ideaId },
        });
    }
};
exports.IdeasActionsService = IdeasActionsService;
exports.IdeasActionsService = IdeasActionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IdeasActionsService);
//# sourceMappingURL=ideas-actions.service.js.map