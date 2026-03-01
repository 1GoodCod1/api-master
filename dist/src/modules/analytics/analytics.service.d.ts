import { PrismaService } from '../shared/database/prisma.service';
import { AnalyticsMasterService } from './services/analytics-master.service';
import { AnalyticsBusinessService } from './services/analytics-business.service';
import { AnalyticsSystemService } from './services/analytics-system.service';
import { MasterAnalyticsResponse, BusinessAnalyticsResponse, SystemAnalyticsResponse, AdvancedAnalyticsResponse } from '../shared/types/analytics.types';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
export declare class AnalyticsService {
    private readonly prisma;
    private readonly masterAnalytics;
    private readonly businessAnalytics;
    private readonly systemAnalytics;
    constructor(prisma: PrismaService, masterAnalytics: AnalyticsMasterService, businessAnalytics: AnalyticsBusinessService, systemAnalytics: AnalyticsSystemService);
    getAnalyticsForUser(user: JwtUser, masterId: string, requestedDays?: number): Promise<MasterAnalyticsResponse>;
    getMyAnalytics(user: JwtUser, requestedDays?: number): Promise<MasterAnalyticsResponse | AdvancedAnalyticsResponse>;
    getMyAdvancedAnalytics(user: JwtUser, requestedDays?: number): Promise<AdvancedAnalyticsResponse>;
    getBusinessAnalytics(days?: number): Promise<BusinessAnalyticsResponse>;
    getSystemAnalytics(): Promise<SystemAnalyticsResponse>;
    private getMasterTariff;
    private isTariffActive;
    getMasterAnalytics(masterId: string, days?: number): Promise<MasterAnalyticsResponse>;
}
