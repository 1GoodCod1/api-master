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
exports.RefreshCookieService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let RefreshCookieService = class RefreshCookieService {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    get isEnabled() {
        return !!this.configService.get('auth.useHttpOnlyCookie');
    }
    get cookieName() {
        return this.configService.get('auth.refreshCookieName') || 'rt';
    }
    get maxAgeSec() {
        const days = this.configService.get('auth.refreshCookieMaxAgeDays') ?? 7;
        return Math.max(86400, days * 24 * 60 * 60);
    }
    getToken(req, bodyToken) {
        const fromBody = bodyToken?.trim();
        if (fromBody)
            return fromBody;
        if (this.isEnabled && req.cookies?.[this.cookieName]) {
            const value = req.cookies[this.cookieName];
            return typeof value === 'string' ? value : undefined;
        }
        return undefined;
    }
    attachIfEnabled(res, token) {
        if (!this.isEnabled || !token)
            return;
        const isProd = this.configService.get('nodeEnv') === 'production';
        const maxAgeMs = this.maxAgeSec * 1000;
        res.cookie(this.cookieName, token, {
            httpOnly: true,
            secure: isProd,
            sameSite: 'lax',
            path: '/',
            maxAge: maxAgeMs,
            expires: new Date(Date.now() + maxAgeMs),
        });
    }
    clearIfEnabled(res) {
        if (!this.isEnabled)
            return;
        res.clearCookie(this.cookieName, { path: '/', httpOnly: true });
    }
    stripRefreshFromPayload(payload) {
        if (!this.isEnabled || !payload.refreshToken)
            return payload;
        const { refreshToken: _rt, ...rest } = payload;
        void _rt;
        return rest;
    }
};
exports.RefreshCookieService = RefreshCookieService;
exports.RefreshCookieService = RefreshCookieService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RefreshCookieService);
//# sourceMappingURL=refresh-cookie.service.js.map