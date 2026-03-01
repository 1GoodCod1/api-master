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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../shared/database/prisma.service");
const email_service_1 = require("../../email/email.service");
let PasswordResetService = class PasswordResetService {
    prisma;
    configService;
    emailService;
    constructor(prisma, configService, emailService) {
        this.prisma = prisma;
        this.configService = configService;
        this.emailService = emailService;
    }
    async forgotPassword(forgotPasswordDto) {
        const { email } = forgotPasswordDto;
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return {
                message: 'If an account with that email exists, a password reset link has been sent.',
            };
        }
        if (user.isBanned) {
            throw new common_1.BadRequestException('Account is banned');
        }
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        await this.prisma.passwordResetToken.deleteMany({
            where: {
                userId: user.id,
                used: false,
                expiresAt: {
                    gt: new Date(),
                },
            },
        });
        await this.prisma.passwordResetToken.create({
            data: {
                token,
                userId: user.id,
                expiresAt,
            },
        });
        const resetLink = `${this.configService.get('frontendUrl')}/reset-password?token=${token}`;
        await this.emailService.sendPasswordResetEmail(user.email, resetLink);
        return {
            message: 'If an account with that email exists, a password reset link has been sent.',
        };
    }
    async resetPassword(resetPasswordDto) {
        const { token, password } = resetPasswordDto;
        const resetToken = await this.prisma.passwordResetToken.findUnique({
            where: { token },
            include: { user: true },
        });
        if (!resetToken) {
            throw new common_1.NotFoundException('Invalid or expired reset token');
        }
        if (resetToken.used) {
            throw new common_1.BadRequestException('This reset token has already been used');
        }
        if (resetToken.expiresAt < new Date()) {
            await this.prisma.passwordResetToken.delete({
                where: { id: resetToken.id },
            });
            throw new common_1.BadRequestException('Reset token has expired. Please request a new one.');
        }
        if (!resetToken.user || resetToken.user.isBanned) {
            throw new common_1.BadRequestException('User not found or banned');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: resetToken.userId },
                data: { password: hashedPassword },
            });
            await tx.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true },
            });
        });
        await this.prisma.passwordResetToken.deleteMany({
            where: {
                userId: resetToken.userId,
                used: false,
            },
        });
        return {
            message: 'Password has been reset successfully',
        };
    }
};
exports.PasswordResetService = PasswordResetService;
exports.PasswordResetService = PasswordResetService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        email_service_1.EmailService])
], PasswordResetService);
//# sourceMappingURL=password-reset.service.js.map