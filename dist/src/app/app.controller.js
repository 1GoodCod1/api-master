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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_service_1 = require("./app.service");
let AppController = class AppController {
    appService;
    constructor(appService) {
        this.appService = appService;
    }
    async getStatus(res) {
        const status = await this.appService.getStatus();
        return res.status(status.code).json(status);
    }
    getFavicon(res) {
        return res.status(common_1.HttpStatus.NO_CONTENT).send();
    }
    async ping() {
        const health = await this.appService.getHealth();
        return {
            success: health.status === 'healthy',
            code: health.status === 'healthy' ? 200 : 503,
            message: health.status === 'healthy' ? 'Pong!' : 'Service unavailable',
            timestamp: health.timestamp,
        };
    }
    async health() {
        return this.appService.getHealth();
    }
    version() {
        return this.appService.getVersion();
    }
    async readiness(res) {
        const status = await this.appService.getStatus();
        if (status.success) {
            return res.status(200).json({
                status: 'ready',
                timestamp: status.timestamp,
            });
        }
        else {
            return res.status(503).json({
                status: 'not ready',
                timestamp: status.timestamp,
                errors: status.services
                    .filter((s) => s.status !== 'up')
                    .map((s) => `${s.name}: ${s.message}`),
            });
        }
    }
    async liveness() {
        return Promise.resolve({
            status: 'alive',
            timestamp: new Date().toISOString(),
        });
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get application status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'All systems operational' }),
    (0, swagger_1.ApiResponse)({ status: 206, description: 'Systems partially operational' }),
    (0, swagger_1.ApiResponse)({ status: 503, description: 'Service unavailable' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('favicon.ico'),
    (0, swagger_1.ApiOperation)({ summary: 'Favicon endpoint' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getFavicon", null);
__decorate([
    (0, common_1.Get)('ping'),
    (0, swagger_1.ApiOperation)({ summary: 'Simple ping endpoint' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "ping", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Health check endpoint' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "health", null);
__decorate([
    (0, common_1.Get)('version'),
    (0, swagger_1.ApiOperation)({ summary: 'Get application version' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "version", null);
__decorate([
    (0, common_1.Get)('readiness'),
    (0, swagger_1.ApiOperation)({ summary: 'Readiness probe for Kubernetes' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "readiness", null);
__decorate([
    (0, common_1.Get)('liveness'),
    (0, swagger_1.ApiOperation)({ summary: 'Liveness probe for Kubernetes' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "liveness", null);
exports.AppController = AppController = __decorate([
    (0, swagger_1.ApiTags)('App'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService])
], AppController);
//# sourceMappingURL=app.controller.js.map