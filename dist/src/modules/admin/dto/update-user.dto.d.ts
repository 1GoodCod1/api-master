import { UserRole } from '@prisma/client';
export declare class AdminUpdateUserDto {
    isVerified?: boolean;
    isBanned?: boolean;
    role?: UserRole;
}
