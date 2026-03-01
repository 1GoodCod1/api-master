"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeStrict = sanitizeStrict;
exports.sanitizeBasic = sanitizeBasic;
exports.sanitizeArray = sanitizeArray;
exports.sanitizeObject = sanitizeObject;
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const STRICT_CONFIG = {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'recursiveEscape',
};
const BASIC_CONFIG = {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
    allowedAttributes: {},
    disallowedTagsMode: 'recursiveEscape',
};
function sanitizeStrict(value) {
    if (!value || typeof value !== 'string') {
        return value;
    }
    return (0, sanitize_html_1.default)(value.trim(), STRICT_CONFIG);
}
function sanitizeBasic(value) {
    if (!value || typeof value !== 'string') {
        return value;
    }
    return (0, sanitize_html_1.default)(value.trim(), BASIC_CONFIG);
}
function sanitizeArray(values, mode = 'strict') {
    if (!Array.isArray(values)) {
        return values;
    }
    const sanitizeFn = mode === 'strict' ? sanitizeStrict : sanitizeBasic;
    return values.map((v) => (typeof v === 'string' ? sanitizeFn(v) : v));
}
function sanitizeObject(obj, mode = 'strict') {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return sanitizeArray(obj, mode);
    }
    const sanitizeFn = mode === 'strict' ? sanitizeStrict : sanitizeBasic;
    const sanitized = {};
    for (const key in obj) {
        if (Object.hasOwn(obj, key)) {
            const value = obj[key];
            if (typeof value === 'string') {
                sanitized[key] = sanitizeFn(value);
            }
            else if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value, mode);
            }
            else {
                sanitized[key] = value;
            }
        }
    }
    return sanitized;
}
//# sourceMappingURL=sanitize-html.util.js.map