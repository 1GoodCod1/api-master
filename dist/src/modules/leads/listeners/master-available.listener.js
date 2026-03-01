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
var MasterAvailableListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterAvailableListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const leads_actions_service_1 = require("../services/leads-actions.service");
let MasterAvailableListener = MasterAvailableListener_1 = class MasterAvailableListener {
    leadsActions;
    logger = new common_1.Logger(MasterAvailableListener_1.name);
    constructor(leadsActions) {
        this.leadsActions = leadsActions;
    }
    async handleMasterAvailable(payload) {
        try {
            await this.leadsActions.notifySubscribersAboutAvailability(payload.masterId);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Ошибка при уведомлении подписчиков о доступности мастера ${payload.masterId}: ${msg}`);
        }
    }
};
exports.MasterAvailableListener = MasterAvailableListener;
__decorate([
    (0, event_emitter_1.OnEvent)('master.available', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MasterAvailableListener.prototype, "handleMasterAvailable", null);
exports.MasterAvailableListener = MasterAvailableListener = MasterAvailableListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [leads_actions_service_1.LeadsActionsService])
], MasterAvailableListener);
//# sourceMappingURL=master-available.listener.js.map