"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeId = encodeId;
exports.decodeId = decodeId;
exports.isValidEncodedId = isValidEncodedId;
const SECRET = process.env.ID_ENCRYPTION_SECRET?.trim();
if (!SECRET) {
    throw new Error('ID_ENCRYPTION_SECRET must be set. Add to .env: ID_ENCRYPTION_SECRET=<32-char-secret>');
}
function encodeId(id) {
    try {
        const combined = `${SECRET}:${id}`;
        const encoded = Buffer.from(combined)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        return encoded;
    }
    catch {
        return id;
    }
}
function decodeId(encoded) {
    try {
        let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const padLength = (4 - (base64.length % 4)) % 4;
        base64 += '='.repeat(padLength);
        const decoded = Buffer.from(base64, 'base64').toString('utf8');
        const [secret, id] = decoded.split(':');
        if (secret !== SECRET || !id)
            return null;
        return id;
    }
    catch {
        return null;
    }
}
function isValidEncodedId(encoded) {
    return decodeId(encoded) !== null;
}
//# sourceMappingURL=id-encoder.js.map