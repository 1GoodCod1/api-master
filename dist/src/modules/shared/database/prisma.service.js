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
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
let PrismaService = class PrismaService extends client_1.PrismaClient {
    pool;
    constructor() {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is not set');
        }
        const pool = new pg_1.Pool({
            connectionString,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            allowExitOnIdle: true,
        });
        pool.on('connect', (client) => {
            try {
                client.connection?.stream?.setKeepAlive?.(true, 60_000);
            }
            catch {
            }
        });
        const adapter = new adapter_pg_1.PrismaPg(pool);
        super({
            adapter,
            log: process.env.NODE_ENV === 'development'
                ? ['query', 'info', 'warn', 'error']
                : ['error'],
        });
        this.pool = pool;
    }
    async onModuleInit() {
        try {
            const connectPromise = this.$connect();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout')), 5000));
            await Promise.race([connectPromise, timeoutPromise]);
        }
        catch (error) {
            if (process.env.NODE_ENV === 'production') {
                throw error;
            }
            console.warn('⚠️ Continuing without database connection (development mode)');
        }
    }
    async onModuleDestroy() {
        try {
            await this.$disconnect();
        }
        catch {
        }
        if (this.pool) {
            try {
                await this.pool.end();
            }
            catch {
            }
        }
    }
    async cleanDatabase() {
        if (process.env.NODE_ENV === 'production')
            return;
        const models = Reflect.ownKeys(this).filter((key) => key[0] !== '_');
        await Promise.all(models.map((modelKey) => {
            try {
                return this[modelKey].deleteMany();
            }
            catch {
                return Promise.resolve();
            }
        }));
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map