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
exports.EncryptionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
let EncryptionService = class EncryptionService {
    configService;
    algorithm = 'aes-256-gcm';
    keyLength = 32;
    ivLength = 16;
    tagLength = 16;
    encryptionKey;
    constructor(configService) {
        this.configService = configService;
        let key = this.configService.get('ENCRYPTION_KEY');
        if (!key) {
            const nodeEnv = this.configService.get('NODE_ENV');
            if (nodeEnv === 'production') {
                throw new Error('ENCRYPTION_KEY is not set in environment variables');
            }
            console.warn('⚠️ WARNING: Using default ENCRYPTION_KEY for development. DO NOT USE IN PRODUCTION!');
            key = 'development-key-change-this-in-production-32chars-minimum';
        }
        this.encryptionKey = crypto.scryptSync(key, 'salt', this.keyLength);
    }
    encrypt(text) {
        if (!text)
            return text;
        try {
            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const authTag = cipher.getAuthTag();
            return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
        }
        catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }
    decrypt(encryptedText) {
        if (!encryptedText)
            return encryptedText;
        try {
            const parts = encryptedText.split(':');
            if (parts.length !== 3) {
                throw new Error('Invalid encrypted data format');
            }
            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encrypted = parts[2];
            const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }
    hash(text) {
        if (text == null || typeof text !== 'string') {
            throw new TypeError('hash() requires a string, received ' + typeof text);
        }
        return crypto.createHash('sha256').update(text).digest('hex');
    }
    maskPhone(phone) {
        if (!phone || phone.length < 8)
            return phone;
        const visibleStart = phone.substring(0, 3);
        const visibleEnd = phone.substring(phone.length - 2);
        const masked = '*'.repeat(phone.length - 5);
        return `${visibleStart}${masked}${visibleEnd}`;
    }
    generateCode(length = 6) {
        const digits = '0123456789';
        let code = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, digits.length);
            code += digits[randomIndex];
        }
        return code;
    }
    generateToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }
};
exports.EncryptionService = EncryptionService;
exports.EncryptionService = EncryptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EncryptionService);
//# sourceMappingURL=encryption.service.js.map