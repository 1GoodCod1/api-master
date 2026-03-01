export declare enum ActivityEvent {
    TRACKED = "activity.tracked"
}
export interface ActivityTrackedPayload {
    userId?: string;
    sessionId?: string;
    action: string;
    masterId?: string;
    categoryId?: string;
    cityId?: string;
    searchQuery?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
}
