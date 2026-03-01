import { RedisService } from '../../shared/redis/redis.service';
import { RecaptchaService } from '../../shared/utils/recaptcha.service';
import { CreateLeadDto } from '../dto/create-lead.dto';
export declare class LeadsSpamService {
    private readonly redis;
    private readonly recaptchaService;
    constructor(redis: RedisService, recaptchaService: RecaptchaService);
    checkProtection(dto: CreateLeadDto, ipAddress?: string): Promise<void>;
    calculateSpamScore(dto: CreateLeadDto): number;
}
