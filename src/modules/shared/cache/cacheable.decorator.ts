import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache:key';
export const CACHE_TTL = 'cache:ttl';
export const CACHE_INVALIDATE = 'cache:invalidate';

/** Service instance with CacheService injected */
interface CacheableTarget {
  cache: {
    getOrSet: (
      key: string,
      fn: () => Promise<unknown>,
      ttl?: number,
    ) => Promise<unknown>;
  };
}

/**
 * Method decorator: caches the result of the method using CacheService.
 * Use on service methods that have `cache` injected.
 *
 * @param key - Cache key (string or function receiving method args)
 * @param ttl - Time to live in seconds
 *
 * @example
 * @Cacheable((filters) => `cache:categories:all:${JSON.stringify(filters || {})}`, 3600)
 * async findAll(filters) { ... }
 */
export function Cacheable(
  key: string | ((...args: unknown[]) => string),
  ttl?: number,
) {
  return function (
    _target: object,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const original = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>;
    descriptor.value = async function (
      this: CacheableTarget,
      ...args: unknown[]
    ) {
      const cache = this.cache;
      if (!cache) {
        throw new Error(
          '@Cacheable requires CacheService to be injected as "cache"',
        );
      }
      const cacheKey = typeof key === 'function' ? key(...args) : key;
      const fetchFn = (): Promise<unknown> =>
        original.apply(this, args) as Promise<unknown>;
      return cache.getOrSet(cacheKey, fetchFn, ttl);
    };
    return descriptor;
  };
}

/**
 * Decorator to invalidate cache after method execution (for interceptors).
 * @param patterns - Cache key patterns to invalidate (can be functions)
 */
export const CacheInvalidate = (
  ...patterns: (string | ((...args: unknown[]) => string))[]
) => {
  return SetMetadata(CACHE_INVALIDATE, patterns);
};
