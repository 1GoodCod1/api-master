import { RecommendationsService } from '../recommendations.service';
import { type ActivityTrackedPayload } from '../events/activity.events';
export declare class RecommendationsListener {
    private readonly recommendationsService;
    private readonly logger;
    constructor(recommendationsService: RecommendationsService);
    handleActivityTracked(payload: ActivityTrackedPayload): Promise<void>;
}
