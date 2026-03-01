export type CreatedAtIdCursor = {
    createdAt: string;
    id: string;
};
export declare function encodeCreatedAtIdCursor(cursor: CreatedAtIdCursor): string;
export declare function decodeCreatedAtIdCursor(token: string | undefined | null): CreatedAtIdCursor | null;
export declare function buildCreatedAtIdCursorWhereDesc<TWhere extends Record<string, unknown>>(where: TWhere, cursor: CreatedAtIdCursor): TWhere;
export declare function nextCursorFromLastCreatedAtId<TItem extends {
    id: string;
    createdAt: Date;
}>(items: TItem[]): string | null;
