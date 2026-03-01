export interface CursorPayload {
    createdAt: string;
    id: string;
}
export interface PaginationMeta {
    total: number;
    limit: number;
    nextCursor: string | null;
    prevCursor?: string | null;
    page: number;
    totalPages: number;
    hasMore: boolean;
}
export interface PaginatedResult<T> {
    items: T[];
    meta: PaginationMeta;
}
export declare function encodeCursor(payload: CursorPayload): string;
export declare function decodeCursor(token: string | null | undefined): CursorPayload | null;
export declare function applyCursorToWhere<TWhere extends Record<string, unknown>>(where: TWhere, cursor: CursorPayload, order?: 'asc' | 'desc'): TWhere;
export declare function buildPaginatedResponse<T extends {
    id: string;
    createdAt: Date;
}>(rawItems: T[], total: number, limit: number, usedCursor: boolean): PaginatedResult<T>;
export declare function cursorOrderBy(order?: 'asc' | 'desc'): Array<Record<string, 'asc' | 'desc'>>;
export interface CursorQueryParams {
    where: Record<string, unknown>;
    orderBy: Array<Record<string, 'asc' | 'desc'>>;
    take: number;
    skip?: number;
}
export declare function buildCursorQuery(baseWhere: Record<string, unknown>, cursor: string | null | undefined, page: number | undefined, limit: number, order?: 'asc' | 'desc'): CursorQueryParams & {
    usedCursor: boolean;
};
