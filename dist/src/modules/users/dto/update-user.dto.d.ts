import { UserRole } from '@prisma/client';
export declare class UpdateUserDto {
    email?: string;
    phone?: string;
    role?: UserRole;
    isVerified?: boolean;
    isBanned?: boolean;
}
