"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeCursor = encodeCursor;
exports.decodeCursor = decodeCursor;
exports.applyCursorToWhere = applyCursorToWhere;
exports.buildPaginatedResponse = buildPaginatedResponse;
exports.cursorOrderBy = cursorOrderBy;
exports.buildCursorQuery = buildCursorQuery;
function encodeCursor(payload) {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}
function decodeCursor(token) {
    if (!token)
        return null;
    try {
        const json = Buffer.from(token, 'base64url').toString('utf8');
        const parsed = JSON.parse(json);
        if (typeof parsed !== 'object' || parsed === null)
            return null;
        const obj = parsed;
        if (typeof obj.createdAt !== 'string' || typeof obj.id !== 'string')
            return null;
        const dt = new Date(obj.createdAt);
        if (Number.isNaN(dt.getTime()))
            return null;
        return { createdAt: obj.createdAt, id: obj.id };
    }
    catch {
        return null;
    }
}
function applyCursorToWhere(where, cursor, order = 'desc') {
    const dt = new Date(cursor.createdAt);
    const comparator = order === 'desc' ? 'lt' : 'gt';
    return {
        AND: [
            where,
            {
                OR: [
                    { createdAt: { [comparator]: dt } },
                    { createdAt: dt, id: { [comparator]: cursor.id } },
                ],
            },
        ],
    };
}
function buildPaginatedResponse(rawItems, total, limit, usedCursor) {
    const hasMore = rawItems.length > limit;
    const items = hasMore ? rawItems.slice(0, limit) : rawItems;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem
        ? encodeCursor({
            id: lastItem.id,
            createdAt: lastItem.createdAt.toISOString(),
        })
        : null;
    return {
        items,
        meta: {
            total,
            limit,
            nextCursor,
            page: usedCursor ? 1 : 1,
            totalPages: Math.ceil(total / limit),
            hasMore,
        },
    };
}
function cursorOrderBy(order = 'desc') {
    return [{ createdAt: order }, { id: order }];
}
function buildCursorQuery(baseWhere, cursor, page, limit, order = 'desc') {
    const decoded = decodeCursor(cursor);
    const usedCursor = Boolean(cursor && decoded);
    const where = usedCursor
        ? applyCursorToWhere(baseWhere, decoded, order)
        : baseWhere;
    const orderBy = cursorOrderBy(order);
    if (usedCursor) {
        return { where, orderBy, take: limit + 1, usedCursor };
    }
    const pageNum = Math.max(1, Number(page) || 1);
    return {
        where,
        orderBy,
        take: limit + 1,
        skip: (pageNum - 1) * limit,
        usedCursor: false,
    };
}
//# sourceMappingURL=cursor-pagination.js.map