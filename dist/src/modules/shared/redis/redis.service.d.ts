import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private configService;
    private readonly logger;
    private client;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    getClient(): Redis;
    set(key: string, value: any, ttl?: number): Promise<void>;
    get<T = any>(key: string): Promise<T | null>;
    del(key: string): Promise<void>;
    incr(key: string): Promise<number>;
    expire(key: string, ttl: number): Promise<void>;
    keys(pattern: string): Promise<string[]>;
    hset(key: string, field: string, value: any): Promise<void>;
    hget<T = any>(key: string, field: string): Promise<T | null>;
    onModuleDestroy(): Promise<void>;
}
