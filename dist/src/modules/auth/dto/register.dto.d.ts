import { UserRole } from '@prisma/client';
export declare class RegisterDto {
    email: string;
    phone: string;
    password: string;
    role?: UserRole;
    firstName?: string;
    lastName?: string;
    city?: string;
    category?: string;
    description?: string;
}
