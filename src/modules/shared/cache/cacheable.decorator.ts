import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache:key';
export const CACHE_TTL = 'cache:ttl';
export const CACHE_INVALIDATE = 'cache:invalidate';

/**
 * Decorator to mark method as cacheable
 * @param key - Cache key (can be a function that receives method arguments)
 * @param ttl - Time to live in seconds
 */
export const Cacheable = (
  key: string | ((...args: any[]) => string),
  _ttl?: number,
) => {
  return SetMetadata(CACHE_KEY, key);
};

/**
 * Decorator to invalidate cache after method execution
 * @param patterns - Cache key patterns to invalidate (can be functions)
 */
export const CacheInvalidate = (
  ...patterns: (string | ((...args: any[]) => string))[]
) => {
  return SetMetadata(CACHE_INVALIDATE, patterns);
};
