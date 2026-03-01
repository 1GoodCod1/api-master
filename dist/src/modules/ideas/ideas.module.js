"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdeasModule = void 0;
const common_1 = require("@nestjs/common");
const ideas_controller_1 = require("./ideas.controller");
const ideas_service_1 = require("./ideas.service");
const ideas_query_service_1 = require("./services/ideas-query.service");
const ideas_actions_service_1 = require("./services/ideas-actions.service");
const prisma_service_1 = require("../shared/database/prisma.service");
let IdeasModule = class IdeasModule {
};
exports.IdeasModule = IdeasModule;
exports.IdeasModule = IdeasModule = __decorate([
    (0, common_1.Module)({
        controllers: [ideas_controller_1.IdeasController],
        providers: [
            ideas_service_1.IdeasService,
            ideas_query_service_1.IdeasQueryService,
            ideas_actions_service_1.IdeasActionsService,
            prisma_service_1.PrismaService,
        ],
        exports: [ideas_service_1.IdeasService],
    })
], IdeasModule);
//# sourceMappingURL=ideas.module.js.map