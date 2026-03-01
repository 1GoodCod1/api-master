"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let EmailService = EmailService_1 = class EmailService {
    configService;
    logger = new common_1.Logger(EmailService_1.name);
    transporter = null;
    constructor(configService) {
        this.configService = configService;
        const smtp = this.configService.get('email.smtp');
        const enabled = this.configService.get('email.enabled');
        if (enabled && smtp?.host && smtp?.user) {
            this.transporter = nodemailer.createTransport({
                host: smtp.host,
                port: smtp.port,
                secure: smtp.secure,
                auth: smtp.user && smtp.pass
                    ? { user: smtp.user, pass: smtp.pass }
                    : undefined,
            });
            this.logger.log('Email SMTP transporter initialized');
        }
        else {
            this.logger.log('Email disabled or SMTP not configured; reset links will be logged in development');
        }
    }
    async sendPasswordResetEmail(to, resetLink) {
        const from = this.configService.get('email.from') || 'noreply@moldmasters.md';
        if (this.transporter) {
            try {
                await this.transporter.sendMail({
                    from,
                    to,
                    subject: 'MoldMasters: Сброс пароля',
                    html: `
            <p>Здравствуйте.</p>
            <p>Вы запросили сброс пароля. Перейдите по ссылке (действует 1 час):</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
            <p>Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
            <p>— MoldMasters</p>
          `,
                    text: `Сброс пароля: ${resetLink}. Ссылка действует 1 час.`,
                });
                this.logger.log(`Password reset email sent to ${to}`);
            }
            catch (err) {
                this.logger.error(`Failed to send password reset email to ${to}:`, err);
                throw err;
            }
            return;
        }
        if (this.configService.get('nodeEnv') === 'development') {
            this.logger.warn(`[EMAIL NOT CONFIGURED] Password reset link for ${to}: ${resetLink}`);
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map