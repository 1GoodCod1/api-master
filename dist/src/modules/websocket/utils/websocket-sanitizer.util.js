"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeNotificationData = sanitizeNotificationData;
exports.sanitizeLeadData = sanitizeLeadData;
exports.sanitizePaymentData = sanitizePaymentData;
exports.sanitizeReviewData = sanitizeReviewData;
exports.sanitizeWebSocketData = sanitizeWebSocketData;
exports.sanitizeMasterId = sanitizeMasterId;
exports.sanitizeUserId = sanitizeUserId;
const sanitize_html_util_1 = require("../../shared/utils/sanitize-html.util");
function sanitizeNotificationData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return data;
    }
    const source = data;
    const sanitized = { ...source };
    if (typeof sanitized.title === 'string') {
        sanitized.title = (0, sanitize_html_util_1.sanitizeStrict)(sanitized.title);
    }
    if (typeof sanitized.message === 'string') {
        sanitized.message = (0, sanitize_html_util_1.sanitizeStrict)(sanitized.message);
    }
    if (sanitized.data !== null &&
        sanitized.data !== undefined &&
        typeof sanitized.data === 'object') {
        sanitized.data = (0, sanitize_html_util_1.sanitizeObject)(sanitized.data, 'strict');
    }
    if (sanitized.metadata !== null &&
        sanitized.metadata !== undefined &&
        typeof sanitized.metadata === 'object') {
        sanitized.metadata = (0, sanitize_html_util_1.sanitizeObject)(sanitized.metadata, 'strict');
    }
    return sanitized;
}
function sanitizeLeadData(leadData) {
    if (!leadData || typeof leadData !== 'object' || Array.isArray(leadData)) {
        return leadData;
    }
    const source = leadData;
    const sanitized = { ...source };
    if (typeof sanitized.clientName === 'string') {
        sanitized.clientName = (0, sanitize_html_util_1.sanitizeStrict)(sanitized.clientName);
    }
    if (typeof sanitized.message === 'string') {
        sanitized.message = (0, sanitize_html_util_1.sanitizeStrict)(sanitized.message);
    }
    if (typeof sanitized.clientPhone === 'string') {
        sanitized.clientPhone = (0, sanitize_html_util_1.sanitizeStrict)(sanitized.clientPhone).replace(/[^\d+\-() ]/g, '');
    }
    return sanitized;
}
function sanitizePaymentData(paymentData) {
    if (!paymentData ||
        typeof paymentData !== 'object' ||
        Array.isArray(paymentData)) {
        return paymentData;
    }
    const source = paymentData;
    const sanitized = { ...source };
    if (typeof sanitized.tariffType === 'string') {
        sanitized.tariffType = (0, sanitize_html_util_1.sanitizeStrict)(sanitized.tariffType);
    }
    if (sanitized.amount !== undefined &&
        sanitized.amount !== null &&
        typeof sanitized.amount !== 'number') {
        sanitized.amount = Number(sanitized.amount) || 0;
    }
    return sanitized;
}
function sanitizeReviewData(reviewData) {
    if (!reviewData ||
        typeof reviewData !== 'object' ||
        Array.isArray(reviewData)) {
        return reviewData;
    }
    const source = reviewData;
    const sanitized = { ...source };
    if (typeof sanitized.comment === 'string') {
        sanitized.comment = (0, sanitize_html_util_1.sanitizeStrict)(sanitized.comment);
    }
    if (sanitized.rating !== undefined && sanitized.rating !== null) {
        const rating = typeof sanitized.rating === 'number'
            ? sanitized.rating
            : Number(sanitized.rating);
        if (isNaN(rating) || rating < 1 || rating > 5) {
            sanitized.rating = 5;
        }
        else {
            sanitized.rating = Math.round(rating);
        }
    }
    return sanitized;
}
function sanitizeWebSocketData(data) {
    if (data === null || data === undefined) {
        return data;
    }
    if (typeof data === 'string') {
        return (0, sanitize_html_util_1.sanitizeStrict)(data);
    }
    if (typeof data === 'number' || typeof data === 'boolean') {
        return data;
    }
    if (Array.isArray(data)) {
        return data.map((item) => sanitizeWebSocketData(item));
    }
    if (typeof data === 'object') {
        return (0, sanitize_html_util_1.sanitizeObject)(data, 'strict');
    }
    return data;
}
function sanitizeMasterId(masterId) {
    if (!masterId) {
        return null;
    }
    const id = String(masterId).trim();
    if (!/^[a-zA-Z0-9\\-]+$/.test(id)) {
        return null;
    }
    return id;
}
function sanitizeUserId(userId) {
    if (!userId) {
        return null;
    }
    const id = String(userId).trim();
    if (!/^[a-zA-Z0-9\\-]+$/.test(id)) {
        return null;
    }
    return id;
}
//# sourceMappingURL=websocket-sanitizer.util.js.map