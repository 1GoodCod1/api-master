import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { VerificationService } from './verification.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';
export declare class VerificationController {
    private readonly verificationService;
    constructor(verificationService: VerificationService);
    submitVerification(user: JwtUser, dto: SubmitVerificationDto): Promise<{
        message: string;
        verificationId: string;
    }>;
    getMyStatus(user: JwtUser): Promise<{
        isVerified: boolean;
        pendingVerification: boolean;
        verification: ({
            documentFront: {
                path: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                filename: string;
                mimetype: string;
                size: number;
                uploadedById: string | null;
            } | null;
            documentBack: {
                path: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                filename: string;
                mimetype: string;
                size: number;
                uploadedById: string | null;
            } | null;
            selfie: {
                path: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                filename: string;
                mimetype: string;
                size: number;
                uploadedById: string | null;
            } | null;
        } & {
            id: string;
            phone: string;
            phoneVerified: boolean;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.VerificationStatus;
            masterId: string;
            documentType: string;
            documentNumber: string;
            documentFrontId: string | null;
            documentBackId: string | null;
            selfieId: string | null;
            notes: string | null;
            reviewedBy: string | null;
            reviewedAt: Date | null;
            submittedAt: Date;
        }) | null;
    }>;
    getVerificationStats(): Promise<{
        approvedCount: number;
        first100Limit: number;
    }>;
    getPendingVerifications(page?: string, limit?: string): Promise<{
        verifications: ({
            master: {
                user: {
                    id: string;
                    email: string;
                    phone: string;
                    phoneVerified: boolean;
                };
            } & {
                id: string;
                avatarFileId: string | null;
                createdAt: Date;
                updatedAt: Date;
                slug: string | null;
                description: string | null;
                userId: string;
                services: import(".prisma/client/runtime/client").JsonValue | null;
                rating: number;
                totalReviews: number;
                experienceYears: number;
                cityId: string;
                categoryId: string;
                tariffExpiresAt: Date | null;
                tariffCancelAtPeriodEnd: boolean;
                pendingUpgradeTo: import("@prisma/client").$Enums.TariffType | null;
                pendingUpgradeCreatedAt: Date | null;
                isFeatured: boolean;
                views: number;
                leadsCount: number;
                extraPhotosCount: number;
                profileLastEditedAt: Date | null;
                pendingVerification: boolean;
                verificationSubmittedAt: Date | null;
                lifetimePremium: boolean;
                isOnline: boolean;
                lastActivityAt: Date | null;
                isBusy: boolean;
                maxLeadsPerDay: number;
                leadsReceivedToday: number;
                leadsResetAt: Date | null;
                availabilityStatus: import("@prisma/client").$Enums.AvailabilityStatus;
                maxActiveLeads: number;
                currentActiveLeads: number;
                telegramChatId: string | null;
                whatsappPhone: string | null;
                workStartHour: number;
                workEndHour: number;
                autoresponderEnabled: boolean;
                autoresponderMessage: string | null;
                slotDurationMinutes: number;
                latitude: number | null;
                longitude: number | null;
                googleCalendarId: string | null;
                tariffType: import("@prisma/client").$Enums.TariffType;
            };
            documentFront: {
                path: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                filename: string;
                mimetype: string;
                size: number;
                uploadedById: string | null;
            } | null;
            documentBack: {
                path: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                filename: string;
                mimetype: string;
                size: number;
                uploadedById: string | null;
            } | null;
            selfie: {
                path: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                filename: string;
                mimetype: string;
                size: number;
                uploadedById: string | null;
            } | null;
        } & {
            id: string;
            phone: string;
            phoneVerified: boolean;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.VerificationStatus;
            masterId: string;
            documentType: string;
            documentNumber: string;
            documentFrontId: string | null;
            documentBackId: string | null;
            selfieId: string | null;
            notes: string | null;
            reviewedBy: string | null;
            reviewedAt: Date | null;
            submittedAt: Date;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getVerificationDetails(id: string): Promise<{
        approvedCount: number;
        first100Limit: number;
        willReceivePremium: boolean;
        nextSlotNumber: number;
        master: {
            user: {
                id: string;
                email: string;
                phone: string;
                phoneVerified: boolean;
                createdAt: Date;
            };
            category: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                slug: string;
                description: string | null;
                icon: string | null;
                isActive: boolean;
                sortOrder: number;
            };
            city: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                slug: string;
                isActive: boolean;
            };
        } & {
            id: string;
            avatarFileId: string | null;
            createdAt: Date;
            updatedAt: Date;
            slug: string | null;
            description: string | null;
            userId: string;
            services: import(".prisma/client/runtime/client").JsonValue | null;
            rating: number;
            totalReviews: number;
            experienceYears: number;
            cityId: string;
            categoryId: string;
            tariffExpiresAt: Date | null;
            tariffCancelAtPeriodEnd: boolean;
            pendingUpgradeTo: import("@prisma/client").$Enums.TariffType | null;
            pendingUpgradeCreatedAt: Date | null;
            isFeatured: boolean;
            views: number;
            leadsCount: number;
            extraPhotosCount: number;
            profileLastEditedAt: Date | null;
            pendingVerification: boolean;
            verificationSubmittedAt: Date | null;
            lifetimePremium: boolean;
            isOnline: boolean;
            lastActivityAt: Date | null;
            isBusy: boolean;
            maxLeadsPerDay: number;
            leadsReceivedToday: number;
            leadsResetAt: Date | null;
            availabilityStatus: import("@prisma/client").$Enums.AvailabilityStatus;
            maxActiveLeads: number;
            currentActiveLeads: number;
            telegramChatId: string | null;
            whatsappPhone: string | null;
            workStartHour: number;
            workEndHour: number;
            autoresponderEnabled: boolean;
            autoresponderMessage: string | null;
            slotDurationMinutes: number;
            latitude: number | null;
            longitude: number | null;
            googleCalendarId: string | null;
            tariffType: import("@prisma/client").$Enums.TariffType;
        };
        documentFront: {
            path: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            filename: string;
            mimetype: string;
            size: number;
            uploadedById: string | null;
        } | null;
        documentBack: {
            path: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            filename: string;
            mimetype: string;
            size: number;
            uploadedById: string | null;
        } | null;
        selfie: {
            path: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            filename: string;
            mimetype: string;
            size: number;
            uploadedById: string | null;
        } | null;
        id: string;
        phone: string;
        phoneVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.VerificationStatus;
        masterId: string;
        documentType: string;
        documentNumber: string;
        documentFrontId: string | null;
        documentBackId: string | null;
        selfieId: string | null;
        notes: string | null;
        reviewedBy: string | null;
        reviewedAt: Date | null;
        submittedAt: Date;
    }>;
    reviewVerification(id: string, user: JwtUser, dto: ReviewVerificationDto): Promise<{
        message: string;
    }>;
}
