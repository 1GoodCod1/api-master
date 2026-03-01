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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisService = RedisService_1 = class RedisService {
    configService;
    logger = new common_1.Logger(RedisService_1.name);
    client;
    constructor(configService) {
        this.configService = configService;
        const options = {
            host: this.configService.get('redis.host', 'localhost'),
            port: this.configService.get('redis.port', 6379),
            password: this.configService.get('redis.password', ''),
            connectTimeout: 10000,
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: true,
            retryStrategy: (times) => {
                if (times > 10) {
                    this.logger.error('Redis retry limit exceeded');
                    return null;
                }
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        };
        this.client = new ioredis_1.default(options);
        this.client.on('error', (err) => {
            this.logger.error('Redis connection error', err);
        });
        this.client.on('connect', () => {
            this.logger.log('Redis connected successfully');
        });
        this.client.on('ready', () => {
            this.logger.log('Redis is ready to accept commands');
        });
        this.client.on('reconnecting', () => {
            this.logger.warn('Redis reconnecting...');
        });
    }
    async onModuleInit() {
        try {
            await Promise.race([
                this.client.ping(),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Redis connection timeout')), 10000);
                }),
            ]);
            this.logger.log('Redis connection initiated and verified');
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(`Redis connection failed: ${msg}`);
            this.logger.warn('Application will continue without Redis. Some features may be unavailable.');
        }
    }
    getClient() {
        return this.client;
    }
    async set(key, value, ttl) {
        try {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            if (ttl) {
                await this.client.setex(key, ttl, stringValue);
            }
            else {
                await this.client.set(key, stringValue);
            }
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Redis set failed for key ${key}:`, msg);
        }
    }
    async get(key) {
        try {
            const value = await this.client.get(key);
            if (!value)
                return null;
            try {
                return JSON.parse(value);
            }
            catch {
                return value;
            }
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Redis get failed for key ${key}:`, msg);
            return null;
        }
    }
    async del(key) {
        try {
            await this.client.del(key);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Redis del failed for key ${key}:`, msg);
        }
    }
    async incr(key) {
        try {
            return await this.client.incr(key);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Redis incr failed for key ${key}:`, msg);
            return 0;
        }
    }
    async expire(key, ttl) {
        try {
            await this.client.expire(key, ttl);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Redis expire failed for key ${key}:`, msg);
        }
    }
    async keys(pattern) {
        try {
            return await this.client.keys(pattern);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Redis keys failed for pattern ${pattern}:`, msg);
            return [];
        }
    }
    async hset(key, field, value) {
        try {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            await this.client.hset(key, field, stringValue);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Redis hset failed for key ${key}, field ${field}:`, msg);
        }
    }
    async hget(key, field) {
        try {
            const value = await this.client.hget(key, field);
            if (!value)
                return null;
            try {
                return JSON.parse(value);
            }
            catch {
                return value;
            }
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Redis hget failed for key ${key}, field ${field}:`, msg);
            return null;
        }
    }
    async onModuleDestroy() {
        try {
            await this.client.quit().catch(() => { });
        }
        catch {
            this.logger.debug('Redis connection closed');
        }
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map