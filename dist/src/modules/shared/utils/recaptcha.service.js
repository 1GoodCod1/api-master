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
exports.RecaptchaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let RecaptchaService = class RecaptchaService {
    configService;
    secretKey;
    minScore = 0.5;
    constructor(configService) {
        this.configService = configService;
        this.secretKey =
            this.configService.get('RECAPTCHA_SECRET_KEY') || '';
    }
    async verifyToken(token, action) {
        if (this.configService.get('NODE_ENV') === 'development' &&
            !this.secretKey) {
            console.log('[reCAPTCHA] Skipping verification in development mode');
            return true;
        }
        if (!this.secretKey) {
            console.warn('reCAPTCHA secret key not configured');
            return true;
        }
        if (!token) {
            throw new common_1.BadRequestException('reCAPTCHA token is required');
        }
        try {
            const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `secret=${this.secretKey}&response=${token}`,
            });
            const data = (await response.json());
            if (!data.success) {
                console.warn('reCAPTCHA verification failed:', data['error-codes']);
                throw new common_1.BadRequestException('reCAPTCHA verification failed');
            }
            if (data.score !== undefined && data.score < this.minScore) {
                console.warn(`reCAPTCHA score too low: ${data.score}`);
                throw new common_1.BadRequestException('Suspicious activity detected');
            }
            if (action && data.action !== action) {
                console.warn(`reCAPTCHA action mismatch: expected ${action}, got ${data.action}`);
                throw new common_1.BadRequestException('Invalid reCAPTCHA action');
            }
            return true;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            console.error('reCAPTCHA verification error:', error);
            throw new common_1.BadRequestException('Failed to verify reCAPTCHA');
        }
    }
    isConfigured() {
        return !!this.secretKey;
    }
};
exports.RecaptchaService = RecaptchaService;
exports.RecaptchaService = RecaptchaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RecaptchaService);
//# sourceMappingURL=recaptcha.service.js.map