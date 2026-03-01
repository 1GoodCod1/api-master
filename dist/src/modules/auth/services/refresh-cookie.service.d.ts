import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
export declare class RefreshCookieService {
    private readonly configService;
    constructor(configService: ConfigService);
    get isEnabled(): boolean;
    private get cookieName();
    private get maxAgeSec();
    getToken(req: Request, bodyToken?: string): string | undefined;
    attachIfEnabled(res: Response, token: string): void;
    clearIfEnabled(res: Response): void;
    stripRefreshFromPayload<T extends {
        refreshToken?: string;
    }>(payload: T): Omit<T, 'refreshToken'>;
}
