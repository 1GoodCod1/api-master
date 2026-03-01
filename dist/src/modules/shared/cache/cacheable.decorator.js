"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheInvalidate = exports.Cacheable = exports.CACHE_INVALIDATE = exports.CACHE_TTL = exports.CACHE_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.CACHE_KEY = 'cache:key';
exports.CACHE_TTL = 'cache:ttl';
exports.CACHE_INVALIDATE = 'cache:invalidate';
const Cacheable = (key, _ttl) => {
    return (0, common_1.SetMetadata)(exports.CACHE_KEY, key);
};
exports.Cacheable = Cacheable;
const CacheInvalidate = (...patterns) => {
    return (0, common_1.SetMetadata)(exports.CACHE_INVALIDATE, patterns);
};
exports.CacheInvalidate = CacheInvalidate;
//# sourceMappingURL=cacheable.decorator.js.map