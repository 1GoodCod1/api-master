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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const users_query_service_1 = require("./services/users-query.service");
const users_manage_service_1 = require("./services/users-manage.service");
let UsersService = class UsersService {
    queryService;
    manageService;
    constructor(queryService, manageService) {
        this.queryService = queryService;
        this.manageService = manageService;
    }
    async count(filters = {}) {
        return this.queryService.count(filters);
    }
    async findOne(id) {
        return this.queryService.findOne(id);
    }
    async update(id, updateUserDto) {
        return this.manageService.update(id, updateUserDto);
    }
    async remove(id) {
        return this.manageService.remove(id);
    }
    async toggleBan(id) {
        return this.manageService.toggleBan(id);
    }
    async toggleVerify(id) {
        return this.manageService.toggleVerify(id);
    }
    async setAvatar(userId, fileId) {
        return this.manageService.setAvatar(userId, fileId);
    }
    async getStatistics() {
        return this.queryService.getStatistics();
    }
    async getMyPhotos(userId) {
        return this.queryService.getMyPhotos(userId);
    }
    async removeMyPhoto(userId, fileId) {
        return this.manageService.removeMyPhoto(userId, fileId);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_query_service_1.UsersQueryService,
        users_manage_service_1.UsersManageService])
], UsersService);
//# sourceMappingURL=users.service.js.map