import type { Master, UserRole } from '@prisma/client';
export interface JwtUser {
    id: string;
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    role: UserRole;
    phoneVerified: boolean;
    isVerified: boolean;
    masterProfile?: Master | null;
}
