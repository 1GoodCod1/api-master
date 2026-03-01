"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSlug = validateSlug;
exports.validateUUID = validateUUID;
exports.validateCUID = validateCUID;
exports.validateId = validateId;
exports.sanitizeParam = sanitizeParam;
exports.validateParamArray = validateParamArray;
function validateSlug(slug) {
    if (!slug || typeof slug !== 'string') {
        return null;
    }
    const slugPattern = /^[\p{L}\d_-]{1,200}$/u;
    if (!slugPattern.test(slug)) {
        return null;
    }
    if (slug.includes('..') || slug.includes('./') || slug.includes('/../')) {
        return null;
    }
    return slug.trim();
}
function validateUUID(id) {
    if (!id || typeof id !== 'string') {
        return false;
    }
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidPattern.test(id);
}
function validateCUID(id) {
    if (!id || typeof id !== 'string') {
        return false;
    }
    const cuidPattern = /^c[0-9a-z]{24}$/i;
    return cuidPattern.test(id);
}
function validateId(id) {
    if (!id || typeof id !== 'string') {
        return false;
    }
    return validateUUID(id) || validateCUID(id) || /^\d+$/.test(id);
}
function sanitizeParam(value, type = 'id') {
    if (type === 'slug') {
        const sanitized = validateSlug(value);
        if (!sanitized) {
            throw new Error('Invalid slug parameter');
        }
        return sanitized;
    }
    if (type === 'id') {
        if (!validateId(value)) {
            throw new Error('Invalid ID parameter');
        }
        return value;
    }
    throw new Error('Invalid parameter type');
}
function validateParamArray(values, type = 'id') {
    if (!Array.isArray(values)) {
        return [];
    }
    return values
        .filter((v) => !!v)
        .filter((v) => (type === 'slug' ? validateSlug(v) !== null : validateId(v)))
        .map((v) => (type === 'slug' ? validateSlug(v) : v));
}
//# sourceMappingURL=slug-validator.util.js.map