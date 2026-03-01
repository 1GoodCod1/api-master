export declare const CACHE_KEY = "cache:key";
export declare const CACHE_TTL = "cache:ttl";
export declare const CACHE_INVALIDATE = "cache:invalidate";
export declare const Cacheable: (key: string | ((...args: any[]) => string), _ttl?: number) => import("@nestjs/common").CustomDecorator<string>;
export declare const CacheInvalidate: (...patterns: (string | ((...args: any[]) => string))[]) => import("@nestjs/common").CustomDecorator<string>;
