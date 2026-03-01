export declare function validateSlug(slug: string | undefined | null): string | null;
export declare function validateUUID(id: string | undefined | null): boolean;
export declare function validateCUID(id: string | undefined | null): boolean;
export declare function validateId(id: string | undefined | null): boolean;
export declare function sanitizeParam(value: string | undefined | null, type?: 'slug' | 'id'): string;
export declare function validateParamArray(values: (string | undefined | null)[], type?: 'slug' | 'id'): string[];
