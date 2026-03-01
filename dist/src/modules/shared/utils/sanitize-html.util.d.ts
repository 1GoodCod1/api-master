export declare function sanitizeStrict(value: string): string;
export declare function sanitizeBasic(value: string): string;
export declare function sanitizeArray(values: string[], mode?: 'strict' | 'basic'): string[];
export declare function sanitizeObject(obj: unknown, mode?: 'strict' | 'basic'): unknown;
