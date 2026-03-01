import { PrismaService } from '../../shared/database/prisma.service';
import { WebsocketService } from '../../websocket/websocket.service';
import { NotificationCategory } from '@prisma/client';
export interface CreateInAppNotificationParams {
    userId: string;
    category: NotificationCategory;
    title: string;
    message: string;
    metadata?: Record<string, any>;
    priority?: 'low' | 'normal' | 'high';
}
export interface CreateAdminNotificationParams {
    category: NotificationCategory;
    title: string;
    message: string;
    metadata?: Record<string, any>;
}
export declare class InAppNotificationService {
    private readonly prisma;
    private readonly websocketService;
    private readonly logger;
    constructor(prisma: PrismaService, websocketService: WebsocketService);
    notify(params: CreateInAppNotificationParams): Promise<{
        id: string;
        createdAt: Date;
        category: import("@prisma/client").$Enums.NotificationCategory | null;
        type: import("@prisma/client").$Enums.NotificationType;
        message: string;
        userId: string | null;
        status: import("@prisma/client").$Enums.NotificationStatus;
        title: string | null;
        metadata: import(".prisma/client/runtime/client").JsonValue | null;
        sentAt: Date | null;
        readAt: Date | null;
    }>;
    notifyAdmins(params: CreateAdminNotificationParams): Promise<{
        id: string;
        createdAt: Date;
        category: import("@prisma/client").$Enums.NotificationCategory | null;
        type: import("@prisma/client").$Enums.NotificationType;
        message: string;
        userId: string | null;
        status: import("@prisma/client").$Enums.NotificationStatus;
        title: string | null;
        metadata: import(".prisma/client/runtime/client").JsonValue | null;
        sentAt: Date | null;
        readAt: Date | null;
    }[] | undefined>;
    notifyNewLead(masterUserId: string, data: {
        leadId: string;
        clientName?: string;
        clientPhone?: string;
        masterId?: string;
    }): Promise<void>;
    notifyLeadStatusUpdated(masterUserId: string, data: {
        leadId: string;
        status: string;
        clientName?: string;
    }): Promise<void>;
    notifyNewReview(masterUserId: string, data: {
        reviewId: string;
        rating: number;
        authorName?: string;
        masterId?: string;
    }): Promise<void>;
    notifyNewChatMessage(recipientUserId: string, data: {
        conversationId: string;
        messageId: string;
        senderType: string;
        senderName?: string;
    }): Promise<void>;
    notifySubscriptionExpiring(masterUserId: string, data: {
        daysLeft: number;
        tariffType: string;
        expiresAt: Date | string;
        masterId: string;
    }): Promise<void>;
    notifySubscriptionExpired(masterUserId: string, data: {
        tariffType: string;
        masterId: string;
    }): Promise<void>;
    notifyPaymentSuccess(userId: string, data: {
        paymentId: string;
        tariffType: string;
        amount: string | number;
    }): Promise<void>;
    notifyPaymentFailed(userId: string, data: {
        paymentId: string;
        tariffType: string;
        reason?: string;
    }): Promise<void>;
    notifyNewVerificationRequest(data: {
        masterId: string;
        masterName?: string;
        verificationId: string;
    }): Promise<void>;
    notifyVerificationApproved(masterUserId: string, data: {
        masterId: string;
        verificationId?: string;
        isFirst100?: boolean;
    }): Promise<void>;
    notifyVerificationRejected(masterUserId: string, data: {
        masterId: string;
        reason?: string;
        verificationId?: string;
    }): Promise<void>;
    notifyNewReport(data: {
        reportId: string;
        reason: string;
        clientId: string;
        masterId: string;
    }): Promise<void>;
    notifyNewRegistration(data: {
        userId: string;
        role: string;
        name?: string;
    }): Promise<void>;
    notifySystemAlert(data: {
        alertType: string;
        message: string;
        details?: any;
    }): Promise<void>;
    notifyLeadSentToClient(clientUserId: string, data: {
        leadId: string;
        masterName: string;
    }): Promise<void>;
    notifyMasterAvailable(clientUserId: string, data: {
        masterId: string;
        masterName?: string;
    }): Promise<void>;
    notifyNewPromotion(clientUserId: string, data: {
        masterId: string;
        masterName: string;
        promotionId: string;
        discount: number;
    }): Promise<void>;
    notifyBookingConfirmed(masterUserId: string, clientUserId: string | null, data: {
        bookingId: string;
        masterId: string;
        masterName?: string;
        clientName?: string;
        startTime: string;
    }): Promise<void>;
    notifyBookingCancelled(masterUserId: string, clientUserId: string | null, data: {
        bookingId: string;
        masterId: string;
        masterName?: string;
        clientName?: string;
        startTime: string;
    }): Promise<void>;
    private categoryToEventType;
}
