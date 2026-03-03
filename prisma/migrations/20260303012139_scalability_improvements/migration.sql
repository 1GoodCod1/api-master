-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'MASTER', 'ADMIN');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'CLOSED', 'SPAM');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('AVATAR', 'MASTER_PHOTOS', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SMS', 'TELEGRAM', 'WHATSAPP', 'EMAIL', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('NEW_LEAD', 'LEAD_STATUS_UPDATED', 'NEW_REVIEW', 'NEW_CHAT_MESSAGE', 'SUBSCRIPTION_EXPIRING', 'SUBSCRIPTION_EXPIRED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'VERIFICATION_APPROVED', 'VERIFICATION_REJECTED', 'ADMIN_NEW_VERIFICATION', 'ADMIN_NEW_REPORT', 'ADMIN_NEW_USER', 'ADMIN_NEW_MASTER', 'ADMIN_SYSTEM_ALERT', 'ADMIN_NEW_LEAD', 'ADMIN_NEW_REVIEW', 'ADMIN_NEW_PAYMENT', 'LEAD_SENT', 'MASTER_RESPONDED', 'MASTER_AVAILABLE', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER', 'NEW_PROMOTION', 'PROMOTION_STARTED', 'SYSTEM_MAINTENANCE', 'SYSTEM_UPDATE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'VISIBLE', 'HIDDEN', 'REPORTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TariffType" AS ENUM ('BASIC', 'VIP', 'PREMIUM');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportAction" AS ENUM ('BAN_CLIENT', 'BAN_MASTER', 'BAN_IP', 'WARNING_CLIENT', 'WARNING_MASTER', 'NO_ACTION');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IMPLEMENTED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('CLIENT', 'MASTER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "bannedAt" TIMESTAMP(3),
    "bannedReason" TEXT,
    "avatarFileId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerifiedAt" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "suspiciousScore" INTEGER NOT NULL DEFAULT 0,
    "warningsCount" INTEGER NOT NULL DEFAULT 0,
    "lastWarningAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "deviceFingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "masters" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "services" JSONB,
    "avatarFileId" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "cityId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "tariffExpiresAt" TIMESTAMP(3),
    "tariffCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "pendingUpgradeTo" "TariffType",
    "pendingUpgradeCreatedAt" TIMESTAMP(3),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "leadsCount" INTEGER NOT NULL DEFAULT 0,
    "extraPhotosCount" INTEGER NOT NULL DEFAULT 0,
    "profileLastEditedAt" TIMESTAMP(3),
    "pendingVerification" BOOLEAN NOT NULL DEFAULT false,
    "verificationSubmittedAt" TIMESTAMP(3),
    "lifetimePremium" BOOLEAN NOT NULL DEFAULT false,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastActivityAt" TIMESTAMP(3),
    "isBusy" BOOLEAN NOT NULL DEFAULT false,
    "maxLeadsPerDay" INTEGER NOT NULL DEFAULT 10,
    "leadsReceivedToday" INTEGER NOT NULL DEFAULT 0,
    "leadsResetAt" TIMESTAMP(3),
    "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "maxActiveLeads" INTEGER NOT NULL DEFAULT 5,
    "currentActiveLeads" INTEGER NOT NULL DEFAULT 0,
    "telegramChatId" TEXT,
    "whatsappPhone" TEXT,
    "workStartHour" INTEGER NOT NULL DEFAULT 9,
    "workEndHour" INTEGER NOT NULL DEFAULT 18,
    "autoresponderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoresponderMessage" TEXT,
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "googleCalendarId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "search_vector" tsvector,
    "tariffType" "TariffType" NOT NULL DEFAULT 'BASIC',

    CONSTRAINT "masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_replies" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "text" VARCHAR(500) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_photos" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "beforeFileId" TEXT NOT NULL,
    "afterFileId" TEXT NOT NULL,
    "serviceTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_verifications" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "documentFrontId" TEXT,
    "documentBackId" TEXT,
    "selfieId" TEXT,
    "phone" TEXT NOT NULL,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_photos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientName" TEXT,
    "clientId" TEXT,
    "message" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "spamScore" INTEGER NOT NULL DEFAULT 0,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_files" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientName" TEXT,
    "clientId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "moderatedBy" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_files" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_criteria" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MDL',
    "tariffType" "TariffType" NOT NULL,
    "stripeId" TEXT,
    "stripeSession" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_analytics" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadsCount" INTEGER NOT NULL DEFAULT 0,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "revenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL,
    "category" "NotificationCategory",
    "title" TEXT,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_analytics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "totalMasters" INTEGER NOT NULL DEFAULT 0,
    "totalLeads" INTEGER NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "cpuUsage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "memoryUsage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "redisKeys" INTEGER NOT NULL DEFAULT 0,
    "queueJobs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_availability_subscriptions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "master_availability_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "leadId" TEXT,
    "clientPhone" TEXT NOT NULL,
    "clientName" TEXT,
    "clientId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "serviceName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_reminders" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "leadId" TEXT,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "action" "ReportAction",
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceFingerprint" TEXT,
    "location" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_blacklist" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "blockedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "permanent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ip_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "action" TEXT NOT NULL,
    "masterId" TEXT,
    "categoryId" TEXT,
    "cityId" TEXT,
    "searchQuery" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariffs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TariffType" NOT NULL,
    "price" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "days" INTEGER NOT NULL DEFAULT 30,
    "stripePriceId" TEXT,
    "description" TEXT,
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tariffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ideas" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IdeaStatus" NOT NULL DEFAULT 'PENDING',
    "authorId" TEXT NOT NULL,
    "votesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "implementedAt" TIMESTAMP(3),
    "adminNote" TEXT,

    CONSTRAINT "ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_votes" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "clientId" TEXT,
    "clientPhone" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_files" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discount" INTEGER NOT NULL,
    "serviceTitle" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_replies" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "content" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_votes" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_avatarFileId_idx" ON "users"("avatarFileId");

-- CreateIndex
CREATE INDEX "users_phoneVerified_idx" ON "users"("phoneVerified");

-- CreateIndex
CREATE INDEX "users_twoFactorEnabled_idx" ON "users"("twoFactorEnabled");

-- CreateIndex
CREATE INDEX "users_suspiciousScore_idx" ON "users"("suspiciousScore");

-- CreateIndex
CREATE INDEX "users_ipAddress_idx" ON "users"("ipAddress");

-- CreateIndex
CREATE INDEX "users_role_isBanned_isVerified_idx" ON "users"("role", "isBanned", "isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "masters_userId_key" ON "masters"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "masters_slug_key" ON "masters"("slug");

-- CreateIndex
CREATE INDEX "masters_cityId_idx" ON "masters"("cityId");

-- CreateIndex
CREATE INDEX "masters_categoryId_idx" ON "masters"("categoryId");

-- CreateIndex
CREATE INDEX "masters_rating_idx" ON "masters"("rating");

-- CreateIndex
CREATE INDEX "masters_avatarFileId_idx" ON "masters"("avatarFileId");

-- CreateIndex
CREATE INDEX "masters_tariffType_idx" ON "masters"("tariffType");

-- CreateIndex
CREATE INDEX "masters_isFeatured_idx" ON "masters"("isFeatured");

-- CreateIndex
CREATE INDEX "masters_createdAt_idx" ON "masters"("createdAt");

-- CreateIndex
CREATE INDEX "masters_slug_idx" ON "masters"("slug");

-- CreateIndex
CREATE INDEX "masters_pendingVerification_idx" ON "masters"("pendingVerification");

-- CreateIndex
CREATE INDEX "masters_lifetimePremium_idx" ON "masters"("lifetimePremium");

-- CreateIndex
CREATE INDEX "masters_isOnline_idx" ON "masters"("isOnline");

-- CreateIndex
CREATE INDEX "masters_lastActivityAt_idx" ON "masters"("lastActivityAt");

-- CreateIndex
CREATE INDEX "masters_categoryId_cityId_isFeatured_tariffType_idx" ON "masters"("categoryId", "cityId", "isFeatured", "tariffType");

-- CreateIndex
CREATE INDEX "masters_categoryId_cityId_rating_idx" ON "masters"("categoryId", "cityId", "rating");

-- CreateIndex
CREATE INDEX "masters_tariffType_isFeatured_rating_idx" ON "masters"("tariffType", "isFeatured", "rating");

-- CreateIndex
CREATE INDEX "masters_categoryId_tariffType_isFeatured_idx" ON "masters"("categoryId", "tariffType", "isFeatured");

-- CreateIndex
CREATE INDEX "masters_isOnline_lastActivityAt_idx" ON "masters"("isOnline", "lastActivityAt");

-- CreateIndex
CREATE INDEX "masters_isBusy_idx" ON "masters"("isBusy");

-- CreateIndex
CREATE INDEX "masters_isBusy_isOnline_idx" ON "masters"("isBusy", "isOnline");

-- CreateIndex
CREATE INDEX "masters_availabilityStatus_idx" ON "masters"("availabilityStatus");

-- CreateIndex
CREATE INDEX "masters_availabilityStatus_currentActiveLeads_idx" ON "masters"("availabilityStatus", "currentActiveLeads");

-- CreateIndex
CREATE INDEX "masters_latitude_longitude_idx" ON "masters"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "quick_replies_masterId_idx" ON "quick_replies"("masterId");

-- CreateIndex
CREATE INDEX "quick_replies_masterId_order_idx" ON "quick_replies"("masterId", "order");

-- CreateIndex
CREATE INDEX "master_photos_masterId_idx" ON "master_photos"("masterId");

-- CreateIndex
CREATE INDEX "master_photos_fileId_idx" ON "master_photos"("fileId");

-- CreateIndex
CREATE INDEX "master_photos_order_idx" ON "master_photos"("order");

-- CreateIndex
CREATE INDEX "master_photos_createdAt_idx" ON "master_photos"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "master_photos_masterId_fileId_key" ON "master_photos"("masterId", "fileId");

-- CreateIndex
CREATE INDEX "portfolio_items_masterId_idx" ON "portfolio_items"("masterId");

-- CreateIndex
CREATE INDEX "portfolio_items_masterId_order_idx" ON "portfolio_items"("masterId", "order");

-- CreateIndex
CREATE INDEX "portfolio_items_createdAt_idx" ON "portfolio_items"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "master_verifications_masterId_key" ON "master_verifications"("masterId");

-- CreateIndex
CREATE INDEX "master_verifications_masterId_idx" ON "master_verifications"("masterId");

-- CreateIndex
CREATE INDEX "master_verifications_status_idx" ON "master_verifications"("status");

-- CreateIndex
CREATE INDEX "master_verifications_submittedAt_idx" ON "master_verifications"("submittedAt");

-- CreateIndex
CREATE INDEX "client_photos_userId_idx" ON "client_photos"("userId");

-- CreateIndex
CREATE INDEX "client_photos_fileId_idx" ON "client_photos"("fileId");

-- CreateIndex
CREATE INDEX "client_photos_order_idx" ON "client_photos"("order");

-- CreateIndex
CREATE INDEX "client_photos_createdAt_idx" ON "client_photos"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_photos_userId_fileId_key" ON "client_photos"("userId", "fileId");

-- CreateIndex
CREATE UNIQUE INDEX "files_path_key" ON "files"("path");

-- CreateIndex
CREATE INDEX "files_mimetype_idx" ON "files"("mimetype");

-- CreateIndex
CREATE INDEX "files_uploadedById_idx" ON "files"("uploadedById");

-- CreateIndex
CREATE INDEX "files_createdAt_idx" ON "files"("createdAt");

-- CreateIndex
CREATE INDEX "files_size_idx" ON "files"("size");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_key" ON "cities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");

-- CreateIndex
CREATE INDEX "leads_masterId_idx" ON "leads"("masterId");

-- CreateIndex
CREATE INDEX "leads_clientPhone_idx" ON "leads"("clientPhone");

-- CreateIndex
CREATE INDEX "leads_clientId_idx" ON "leads"("clientId");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");

-- CreateIndex
CREATE INDEX "leads_masterId_status_createdAt_idx" ON "leads"("masterId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "leads_clientId_status_createdAt_idx" ON "leads"("clientId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "lead_files_leadId_idx" ON "lead_files"("leadId");

-- CreateIndex
CREATE INDEX "lead_files_fileId_idx" ON "lead_files"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_files_leadId_fileId_key" ON "lead_files"("leadId", "fileId");

-- CreateIndex
CREATE INDEX "reviews_masterId_idx" ON "reviews"("masterId");

-- CreateIndex
CREATE INDEX "reviews_clientPhone_idx" ON "reviews"("clientPhone");

-- CreateIndex
CREATE INDEX "reviews_clientId_idx" ON "reviews"("clientId");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- CreateIndex
CREATE INDEX "reviews_createdAt_idx" ON "reviews"("createdAt");

-- CreateIndex
CREATE INDEX "reviews_masterId_status_createdAt_idx" ON "reviews"("masterId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "reviews_masterId_rating_status_idx" ON "reviews"("masterId", "rating", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_masterId_clientPhone_key" ON "reviews"("masterId", "clientPhone");

-- CreateIndex
CREATE INDEX "review_files_reviewId_idx" ON "review_files"("reviewId");

-- CreateIndex
CREATE INDEX "review_files_fileId_idx" ON "review_files"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "review_files_reviewId_fileId_key" ON "review_files"("reviewId", "fileId");

-- CreateIndex
CREATE INDEX "review_criteria_reviewId_idx" ON "review_criteria"("reviewId");

-- CreateIndex
CREATE INDEX "review_criteria_criteria_idx" ON "review_criteria"("criteria");

-- CreateIndex
CREATE UNIQUE INDEX "review_criteria_reviewId_criteria_key" ON "review_criteria"("reviewId", "criteria");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeId_key" ON "payments"("stripeId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeSession_key" ON "payments"("stripeSession");

-- CreateIndex
CREATE INDEX "payments_masterId_idx" ON "payments"("masterId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "payments_masterId_status_createdAt_idx" ON "payments"("masterId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "payments_userId_status_createdAt_idx" ON "payments"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "master_analytics_masterId_idx" ON "master_analytics"("masterId");

-- CreateIndex
CREATE INDEX "master_analytics_date_idx" ON "master_analytics"("date");

-- CreateIndex
CREATE INDEX "master_analytics_date_masterId_idx" ON "master_analytics"("date", "masterId");

-- CreateIndex
CREATE UNIQUE INDEX "master_analytics_masterId_date_key" ON "master_analytics"("masterId", "date");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_category_idx" ON "notifications"("category");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_status_createdAt_idx" ON "notifications"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_type_createdAt_idx" ON "notifications"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_category_createdAt_idx" ON "notifications"("userId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "system_analytics_date_idx" ON "system_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "system_analytics_date_key" ON "system_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "favorites_userId_idx" ON "favorites"("userId");

-- CreateIndex
CREATE INDEX "favorites_masterId_idx" ON "favorites"("masterId");

-- CreateIndex
CREATE INDEX "favorites_userId_createdAt_idx" ON "favorites"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "favorites_masterId_createdAt_idx" ON "favorites"("masterId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_masterId_key" ON "favorites"("userId", "masterId");

-- CreateIndex
CREATE INDEX "master_availability_subscriptions_clientId_idx" ON "master_availability_subscriptions"("clientId");

-- CreateIndex
CREATE INDEX "master_availability_subscriptions_masterId_idx" ON "master_availability_subscriptions"("masterId");

-- CreateIndex
CREATE INDEX "master_availability_subscriptions_masterId_notifiedAt_idx" ON "master_availability_subscriptions"("masterId", "notifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "master_availability_subscriptions_clientId_masterId_key" ON "master_availability_subscriptions"("clientId", "masterId");

-- CreateIndex
CREATE INDEX "bookings_masterId_idx" ON "bookings"("masterId");

-- CreateIndex
CREATE INDEX "bookings_leadId_idx" ON "bookings"("leadId");

-- CreateIndex
CREATE INDEX "bookings_clientPhone_idx" ON "bookings"("clientPhone");

-- CreateIndex
CREATE INDEX "bookings_clientId_idx" ON "bookings"("clientId");

-- CreateIndex
CREATE INDEX "bookings_startTime_idx" ON "bookings"("startTime");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_createdAt_idx" ON "bookings"("createdAt");

-- CreateIndex
CREATE INDEX "bookings_masterId_status_startTime_idx" ON "bookings"("masterId", "status", "startTime");

-- CreateIndex
CREATE INDEX "bookings_masterId_status_createdAt_idx" ON "bookings"("masterId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "bookings_masterId_startTime_idx" ON "bookings"("masterId", "startTime");

-- CreateIndex
CREATE INDEX "bookings_masterId_startTime_endTime_idx" ON "bookings"("masterId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "bookings_clientId_status_createdAt_idx" ON "bookings"("clientId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "booking_reminders_bookingId_idx" ON "booking_reminders"("bookingId");

-- CreateIndex
CREATE INDEX "booking_reminders_sentAt_idx" ON "booking_reminders"("sentAt");

-- CreateIndex
CREATE INDEX "booking_reminders_type_idx" ON "booking_reminders"("type");

-- CreateIndex
CREATE UNIQUE INDEX "booking_reminders_bookingId_type_key" ON "booking_reminders"("bookingId", "type");

-- CreateIndex
CREATE INDEX "reports_clientId_idx" ON "reports"("clientId");

-- CreateIndex
CREATE INDEX "reports_masterId_idx" ON "reports"("masterId");

-- CreateIndex
CREATE INDEX "reports_leadId_idx" ON "reports"("leadId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_createdAt_idx" ON "reports"("createdAt");

-- CreateIndex
CREATE INDEX "phone_verifications_userId_idx" ON "phone_verifications"("userId");

-- CreateIndex
CREATE INDEX "phone_verifications_phone_idx" ON "phone_verifications"("phone");

-- CreateIndex
CREATE INDEX "phone_verifications_code_idx" ON "phone_verifications"("code");

-- CreateIndex
CREATE INDEX "phone_verifications_expiresAt_idx" ON "phone_verifications"("expiresAt");

-- CreateIndex
CREATE INDEX "login_history_userId_idx" ON "login_history"("userId");

-- CreateIndex
CREATE INDEX "login_history_ipAddress_idx" ON "login_history"("ipAddress");

-- CreateIndex
CREATE INDEX "login_history_createdAt_idx" ON "login_history"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ip_blacklist_ipAddress_key" ON "ip_blacklist"("ipAddress");

-- CreateIndex
CREATE INDEX "ip_blacklist_ipAddress_idx" ON "ip_blacklist"("ipAddress");

-- CreateIndex
CREATE INDEX "ip_blacklist_expiresAt_idx" ON "ip_blacklist"("expiresAt");

-- CreateIndex
CREATE INDEX "user_activities_userId_idx" ON "user_activities"("userId");

-- CreateIndex
CREATE INDEX "user_activities_sessionId_idx" ON "user_activities"("sessionId");

-- CreateIndex
CREATE INDEX "user_activities_action_idx" ON "user_activities"("action");

-- CreateIndex
CREATE INDEX "user_activities_masterId_idx" ON "user_activities"("masterId");

-- CreateIndex
CREATE INDEX "user_activities_categoryId_idx" ON "user_activities"("categoryId");

-- CreateIndex
CREATE INDEX "user_activities_createdAt_idx" ON "user_activities"("createdAt");

-- CreateIndex
CREATE INDEX "tariffs_type_idx" ON "tariffs"("type");

-- CreateIndex
CREATE INDEX "tariffs_isActive_idx" ON "tariffs"("isActive");

-- CreateIndex
CREATE INDEX "tariffs_sortOrder_idx" ON "tariffs"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "tariffs_type_key" ON "tariffs"("type");

-- CreateIndex
CREATE INDEX "ideas_status_idx" ON "ideas"("status");

-- CreateIndex
CREATE INDEX "ideas_votesCount_idx" ON "ideas"("votesCount");

-- CreateIndex
CREATE INDEX "ideas_createdAt_idx" ON "ideas"("createdAt");

-- CreateIndex
CREATE INDEX "ideas_authorId_idx" ON "ideas"("authorId");

-- CreateIndex
CREATE INDEX "idea_votes_ideaId_idx" ON "idea_votes"("ideaId");

-- CreateIndex
CREATE INDEX "idea_votes_userId_idx" ON "idea_votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "idea_votes_ideaId_userId_key" ON "idea_votes"("ideaId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_leadId_key" ON "conversations"("leadId");

-- CreateIndex
CREATE INDEX "conversations_masterId_idx" ON "conversations"("masterId");

-- CreateIndex
CREATE INDEX "conversations_clientId_idx" ON "conversations"("clientId");

-- CreateIndex
CREATE INDEX "conversations_leadId_idx" ON "conversations"("leadId");

-- CreateIndex
CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_createdAt_idx" ON "conversations"("createdAt");

-- CreateIndex
CREATE INDEX "conversations_masterId_lastMessageAt_idx" ON "conversations"("masterId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_clientId_lastMessageAt_idx" ON "conversations"("clientId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_readAt_idx" ON "messages"("readAt");

-- CreateIndex
CREATE INDEX "message_files_messageId_idx" ON "message_files"("messageId");

-- CreateIndex
CREATE INDEX "message_files_fileId_idx" ON "message_files"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "message_files_messageId_fileId_key" ON "message_files"("messageId", "fileId");

-- CreateIndex
CREATE INDEX "promotions_masterId_idx" ON "promotions"("masterId");

-- CreateIndex
CREATE INDEX "promotions_isActive_idx" ON "promotions"("isActive");

-- CreateIndex
CREATE INDEX "promotions_validFrom_validUntil_idx" ON "promotions"("validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "promotions_masterId_isActive_validUntil_idx" ON "promotions"("masterId", "isActive", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "review_replies_reviewId_key" ON "review_replies"("reviewId");

-- CreateIndex
CREATE INDEX "review_replies_reviewId_idx" ON "review_replies"("reviewId");

-- CreateIndex
CREATE INDEX "review_replies_masterId_idx" ON "review_replies"("masterId");

-- CreateIndex
CREATE INDEX "review_votes_reviewId_idx" ON "review_votes"("reviewId");

-- CreateIndex
CREATE INDEX "review_votes_userId_idx" ON "review_votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "review_votes_reviewId_userId_key" ON "review_votes"("reviewId", "userId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatarFileId_fkey" FOREIGN KEY ("avatarFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "masters" ADD CONSTRAINT "masters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "masters" ADD CONSTRAINT "masters_avatarFileId_fkey" FOREIGN KEY ("avatarFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "masters" ADD CONSTRAINT "masters_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "masters" ADD CONSTRAINT "masters_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_photos" ADD CONSTRAINT "master_photos_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_photos" ADD CONSTRAINT "master_photos_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_beforeFileId_fkey" FOREIGN KEY ("beforeFileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_afterFileId_fkey" FOREIGN KEY ("afterFileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_verifications" ADD CONSTRAINT "master_verifications_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_verifications" ADD CONSTRAINT "master_verifications_documentFrontId_fkey" FOREIGN KEY ("documentFrontId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_verifications" ADD CONSTRAINT "master_verifications_documentBackId_fkey" FOREIGN KEY ("documentBackId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_verifications" ADD CONSTRAINT "master_verifications_selfieId_fkey" FOREIGN KEY ("selfieId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_photos" ADD CONSTRAINT "client_photos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_photos" ADD CONSTRAINT "client_photos_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_files" ADD CONSTRAINT "lead_files_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_files" ADD CONSTRAINT "lead_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_files" ADD CONSTRAINT "review_files_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_files" ADD CONSTRAINT "review_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_criteria" ADD CONSTRAINT "review_criteria_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_analytics" ADD CONSTRAINT "master_analytics_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_availability_subscriptions" ADD CONSTRAINT "master_availability_subscriptions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_availability_subscriptions" ADD CONSTRAINT "master_availability_subscriptions_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_reminders" ADD CONSTRAINT "booking_reminders_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_verifications" ADD CONSTRAINT "phone_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_votes" ADD CONSTRAINT "idea_votes_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_votes" ADD CONSTRAINT "idea_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_files" ADD CONSTRAINT "message_files_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_files" ADD CONSTRAINT "message_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
- -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   M o l d M a s t e r s   S c a l a b i l i t y   M i g r a t i o n  
 - -   R u n   t h i s   O N C E   a g a i n s t   y o u r   p r o d u c t i o n   d a t a b a s e   b e f o r e   d e p l o y i n g   t h e   n e w   c o d e .  
 - -   S a f e   t o   r u n   m u l t i p l e   t i m e s   ( a l l   s t a t e m e n t s   a r e   i d e m p o t e n t   v i a   I F   N O T   E X I S T S ) .  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
  
 - -   - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  
 - -   1 .   F u l l - T e x t   S e a r c h :   t s v e c t o r   c o l u m n   +   G I N   i n d e x   o n   m a s t e r s   t a b l e  
 - -         E n a b l e s   P o s t g r e S Q L   f u l l - t e x t   s e a r c h   i n s t e a d   o f   s l o w   I L I K E   ' % t e r m % '   s c a n s .  
 - -   - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  
  
 - -   A d d   t h e   s e a r c h _ v e c t o r   c o l u m n   ( n o - o p   i f   a l r e a d y   e x i s t s )  
 A L T E R   T A B L E   m a s t e r s   A D D   C O L U M N   I F   N O T   E X I S T S   s e a r c h _ v e c t o r   t s v e c t o r ;  
  
 - -   P o p u l a t e   s e a r c h _ v e c t o r   f o r   a l l   e x i s t i n g   m a s t e r s  
 U P D A T E   m a s t e r s   m  
 S E T   s e a r c h _ v e c t o r   =  
         s e t w e i g h t ( t o _ t s v e c t o r ( ' r u s s i a n ' ,  
                 C O A L E S C E ( u . " f i r s t N a m e " ,   ' ' )   | |   '   '   | |   C O A L E S C E ( u . " l a s t N a m e " ,   ' ' )  
         ) ,   ' A ' )   | |  
         s e t w e i g h t ( t o _ t s v e c t o r ( ' r u s s i a n ' ,   C O A L E S C E ( m . d e s c r i p t i o n ,   ' ' ) ) ,   ' B ' )   | |  
         s e t w e i g h t ( t o _ t s v e c t o r ( ' s i m p l e ' ,     C O A L E S C E ( m . s l u g ,   ' ' ) ) ,   ' D ' )  
 F R O M   u s e r s   u  
 W H E R E   u . i d   =   m . " u s e r I d " ;  
  
 - -   C r e a t e   G I N   i n d e x   f o r   f a s t   f u l l - t e x t   l o o k u p  
 C R E A T E   I N D E X   C O N C U R R E N T L Y   I F   N O T   E X I S T S   i d x _ m a s t e r s _ s e a r c h _ v e c t o r  
         O N   m a s t e r s   U S I N G   G I N ( s e a r c h _ v e c t o r ) ;  
  
 - -   T r i g g e r   f u n c t i o n :   k e e p   s e a r c h _ v e c t o r   u p - t o - d a t e   w h e n   m a s t e r ' s   o w n   f i e l d s   c h a n g e  
 C R E A T E   O R   R E P L A C E   F U N C T I O N   t r g _ m a s t e r s _ s e a r c h _ v e c t o r ( )   R E T U R N S   t r i g g e r   A S   $ $  
 D E C L A R E  
         v _ f i r s t _ n a m e   T E X T ;  
         v _ l a s t _ n a m e     T E X T ;  
 B E G I N  
         - -   F e t c h   l a t e s t   u s e r   n a m e  
         S E L E C T   " f i r s t N a m e " ,   " l a s t N a m e "  
         I N T O   v _ f i r s t _ n a m e ,   v _ l a s t _ n a m e  
         F R O M   u s e r s  
         W H E R E   i d   =   N E W . " u s e r I d " ;  
  
         N E W . s e a r c h _ v e c t o r   : =  
                 s e t w e i g h t ( t o _ t s v e c t o r ( ' r u s s i a n ' ,  
                         C O A L E S C E ( v _ f i r s t _ n a m e ,   ' ' )   | |   '   '   | |   C O A L E S C E ( v _ l a s t _ n a m e ,   ' ' )  
                 ) ,   ' A ' )   | |  
                 s e t w e i g h t ( t o _ t s v e c t o r ( ' r u s s i a n ' ,   C O A L E S C E ( N E W . d e s c r i p t i o n ,   ' ' ) ) ,   ' B ' )   | |  
                 s e t w e i g h t ( t o _ t s v e c t o r ( ' s i m p l e ' ,     C O A L E S C E ( N E W . s l u g ,   ' ' ) ) ,   ' D ' ) ;  
         R E T U R N   N E W ;  
 E N D ;  
 $ $   L A N G U A G E   p l p g s q l ;  
  
 - -   A t t a c h   t r i g g e r   t o   m a s t e r s   ( f i r e s   o n   I N S E R T   o r   U P D A T E   o f   r e l e v a n t   c o l u m n s )  
 D R O P   T R I G G E R   I F   E X I S T S   t r g _ m a s t e r s _ s e a r c h _ v e c t o r   O N   m a s t e r s ;  
 C R E A T E   T R I G G E R   t r g _ m a s t e r s _ s e a r c h _ v e c t o r  
         B E F O R E   I N S E R T   O R   U P D A T E   O F   d e s c r i p t i o n ,   s l u g ,   " u s e r I d "  
         O N   m a s t e r s  
         F O R   E A C H   R O W   E X E C U T E   F U N C T I O N   t r g _ m a s t e r s _ s e a r c h _ v e c t o r ( ) ;  
  
  
 - -   - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  
 - -   2 .   A d d i t i o n a l   p e r f o r m a n c e   i n d e x e s   ( s a f e ,   u s e   C O N C U R R E N T L Y   t o   a v o i d   l o c k s )  
 - -   - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  
  
 - -   C o m p o s i t e   i n d e x   f o r   t h e   m o s t   c o m m o n   s e a r c h   f i l t e r :   c a t e g o r y   +   c i t y   +   t a r i f f   +   r a t i n g  
 C R E A T E   I N D E X   C O N C U R R E N T L Y   I F   N O T   E X I S T S   i d x _ m a s t e r s _ s e a r c h _ m a i n  
         O N   m a s t e r s ( " c a t e g o r y I d " ,   " c i t y I d " ,   " t a r i f f T y p e " ,   r a t i n g   D E S C ,   " i s F e a t u r e d " )  
         W H E R E   " c a t e g o r y I d "   I S   N O T   N U L L   A N D   " c i t y I d "   I S   N O T   N U L L ;  
  
 - -   I n d e x   f o r   " a v a i l a b l e   n o w "   f i l t e r  
 C R E A T E   I N D E X   C O N C U R R E N T L Y   I F   N O T   E X I S T S   i d x _ m a s t e r s _ a v a i l a b l e _ n o w  
         O N   m a s t e r s ( " i s O n l i n e " ,   " a v a i l a b i l i t y S t a t u s " ,   " c a t e g o r y I d " ,   " c i t y I d " )  
         W H E R E   " i s O n l i n e "   =   t r u e   A N D   " a v a i l a b i l i t y S t a t u s "   =   ' A V A I L A B L E ' ;  
  
 - -   I n d e x   f o r   t a r i f f   e x p i r y   c h e c k s  
 C R E A T E   I N D E X   C O N C U R R E N T L Y   I F   N O T   E X I S T S   i d x _ m a s t e r s _ t a r i f f _ e x p i r y  
         O N   m a s t e r s ( " t a r i f f T y p e " ,   " t a r i f f E x p i r e s A t " )  
         W H E R E   " t a r i f f T y p e "   ! =   ' B A S I C ' ;  
  
 C O M M I T ;  
 