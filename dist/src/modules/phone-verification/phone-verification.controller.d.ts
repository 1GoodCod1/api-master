import { PhoneVerificationService } from './phone-verification.service';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { VerifyCodeDto } from './dto/verify-code.dto';
export declare class PhoneVerificationController {
    private readonly phoneVerificationService;
    constructor(phoneVerificationService: PhoneVerificationService);
    sendCode(user: JwtUser): Promise<{
        message: string;
        expiresAt: Date;
    }>;
    verify(user: JwtUser, dto: VerifyCodeDto): Promise<{
        message: string;
    }>;
    getStatus(user: JwtUser): Promise<{
        phoneVerified: boolean;
        phoneVerifiedAt: Date | null;
    }>;
}
