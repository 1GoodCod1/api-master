import type { Response } from 'express';
import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getStatus(res: Response): Promise<Response<any, Record<string, any>>>;
    getFavicon(res: Response): Response<any, Record<string, any>>;
    ping(): Promise<{
        success: boolean;
        code: number;
        message: string;
        timestamp: string;
    }>;
    health(): Promise<{
        status: string;
        timestamp: string;
    }>;
    version(): {
        version: string;
        build: string;
        name: string;
    };
    readiness(res: Response): Promise<Response<any, Record<string, any>>>;
    liveness(): Promise<{
        status: string;
        timestamp: string;
    }>;
}
