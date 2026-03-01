export declare function generateSlug(text: string): string;
export declare function generateUniqueSlug(base: string, existingSlugs?: string[]): string;
export declare function generateUniqueSlugWithDb(base: string, getSlugsWithPrefix: (prefix: string) => Promise<string[]>): Promise<string>;
