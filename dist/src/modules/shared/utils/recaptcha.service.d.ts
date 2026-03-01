import { ConfigService } from '@nestjs/config';
export declare class RecaptchaService {
    private readonly configService;
    private readonly secretKey;
    private readonly minScore;
    constructor(configService: ConfigService);
    verifyToken(token: string, action?: string): Promise<boolean>;
    isConfigured(): boolean;
}
