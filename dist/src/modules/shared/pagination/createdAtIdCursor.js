"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeCreatedAtIdCursor = encodeCreatedAtIdCursor;
exports.decodeCreatedAtIdCursor = decodeCreatedAtIdCursor;
exports.buildCreatedAtIdCursorWhereDesc = buildCreatedAtIdCursorWhereDesc;
exports.nextCursorFromLastCreatedAtId = nextCursorFromLastCreatedAtId;
function isRecord(v) {
    return typeof v === 'object' && v !== null;
}
function encodeCreatedAtIdCursor(cursor) {
    const json = JSON.stringify(cursor);
    return Buffer.from(json, 'utf8').toString('base64url');
}
function decodeCreatedAtIdCursor(token) {
    if (!token)
        return null;
    try {
        const json = Buffer.from(token, 'base64url').toString('utf8');
        const parsed = JSON.parse(json);
        if (!isRecord(parsed))
            return null;
        const createdAt = parsed.createdAt;
        const id = parsed.id;
        if (typeof createdAt !== 'string' || typeof id !== 'string')
            return null;
        const dt = new Date(createdAt);
        if (Number.isNaN(dt.getTime()))
            return null;
        if (!id)
            return null;
        return { createdAt, id };
    }
    catch {
        return null;
    }
}
function buildCreatedAtIdCursorWhereDesc(where, cursor) {
    const dt = new Date(cursor.createdAt);
    return {
        AND: [
            where,
            {
                OR: [
                    { createdAt: { lt: dt } },
                    { createdAt: dt, id: { lt: cursor.id } },
                ],
            },
        ],
    };
}
function nextCursorFromLastCreatedAtId(items) {
    const last = items.at(-1);
    if (!last)
        return null;
    return encodeCreatedAtIdCursor({
        id: last.id,
        createdAt: last.createdAt.toISOString(),
    });
}
//# sourceMappingURL=createdAtIdCursor.js.map