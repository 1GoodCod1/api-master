declare const ALLOWED_ACTIONS: readonly ["filter", "search"];
export declare class TrackActivityDto {
    action: (typeof ALLOWED_ACTIONS)[number];
    searchQuery?: string;
    categoryId?: string;
    cityId?: string;
}
export {};
