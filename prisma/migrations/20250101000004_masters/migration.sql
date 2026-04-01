-- Masters: мастера, профиль, портфолио, верификация
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
    "leadNotifyChannel" "LeadNotifyChannel" DEFAULT 'BOTH',
    "notifyTariffSms" BOOLEAN NOT NULL DEFAULT true,
    "notifyTariffInApp" BOOLEAN NOT NULL DEFAULT true,
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

CREATE TABLE "quick_replies" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "text" VARCHAR(500) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "quick_replies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "master_photos" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "master_photos_pkey" PRIMARY KEY ("id")
);

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
    "documentsDeletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "master_verifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "masters_userId_key" ON "masters"("userId");
CREATE UNIQUE INDEX "masters_slug_key" ON "masters"("slug");
CREATE INDEX "masters_cityId_idx" ON "masters"("cityId");
CREATE INDEX "masters_categoryId_idx" ON "masters"("categoryId");
CREATE INDEX "masters_rating_idx" ON "masters"("rating");
CREATE INDEX "masters_tariffType_idx" ON "masters"("tariffType");
CREATE INDEX "masters_isFeatured_idx" ON "masters"("isFeatured");
CREATE INDEX "masters_createdAt_idx" ON "masters"("createdAt");
CREATE INDEX "masters_categoryId_cityId_isFeatured_tariffType_idx" ON "masters"("categoryId", "cityId", "isFeatured", "tariffType");
CREATE INDEX "masters_categoryId_cityId_rating_idx" ON "masters"("categoryId", "cityId", "rating");
CREATE INDEX "masters_tariffType_isFeatured_rating_idx" ON "masters"("tariffType", "isFeatured", "rating");
CREATE INDEX "masters_categoryId_tariffType_isFeatured_idx" ON "masters"("categoryId", "tariffType", "isFeatured");
CREATE INDEX "masters_isOnline_lastActivityAt_idx" ON "masters"("isOnline", "lastActivityAt");
CREATE INDEX "masters_isBusy_isOnline_idx" ON "masters"("isBusy", "isOnline");
CREATE INDEX "masters_availabilityStatus_currentActiveLeads_idx" ON "masters"("availabilityStatus", "currentActiveLeads");

CREATE INDEX "quick_replies_masterId_idx" ON "quick_replies"("masterId");
CREATE INDEX "quick_replies_masterId_order_idx" ON "quick_replies"("masterId", "order");
CREATE INDEX "master_photos_masterId_idx" ON "master_photos"("masterId");
CREATE INDEX "master_photos_fileId_idx" ON "master_photos"("fileId");
CREATE INDEX "master_photos_order_idx" ON "master_photos"("order");
CREATE INDEX "master_photos_createdAt_idx" ON "master_photos"("createdAt");
CREATE UNIQUE INDEX "master_photos_masterId_fileId_key" ON "master_photos"("masterId", "fileId");
CREATE INDEX "portfolio_items_masterId_idx" ON "portfolio_items"("masterId");
CREATE INDEX "portfolio_items_masterId_order_idx" ON "portfolio_items"("masterId", "order");
CREATE INDEX "portfolio_items_createdAt_idx" ON "portfolio_items"("createdAt");
CREATE UNIQUE INDEX "master_verifications_masterId_key" ON "master_verifications"("masterId");
CREATE INDEX "master_verifications_masterId_idx" ON "master_verifications"("masterId");
CREATE INDEX "master_verifications_status_idx" ON "master_verifications"("status");
CREATE INDEX "master_verifications_submittedAt_idx" ON "master_verifications"("submittedAt");

ALTER TABLE "masters" ADD CONSTRAINT "masters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "masters" ADD CONSTRAINT "masters_avatarFileId_fkey" FOREIGN KEY ("avatarFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "masters" ADD CONSTRAINT "masters_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "masters" ADD CONSTRAINT "masters_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "master_photos" ADD CONSTRAINT "master_photos_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "master_photos" ADD CONSTRAINT "master_photos_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_beforeFileId_fkey" FOREIGN KEY ("beforeFileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_afterFileId_fkey" FOREIGN KEY ("afterFileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "master_verifications" ADD CONSTRAINT "master_verifications_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "master_verifications" ADD CONSTRAINT "master_verifications_documentFrontId_fkey" FOREIGN KEY ("documentFrontId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "master_verifications" ADD CONSTRAINT "master_verifications_documentBackId_fkey" FOREIGN KEY ("documentBackId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "master_verifications" ADD CONSTRAINT "master_verifications_selfieId_fkey" FOREIGN KEY ("selfieId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Одноразовые токены привязки Telegram
CREATE TABLE "telegram_connect_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "telegram_connect_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telegram_connect_tokens_token_key" ON "telegram_connect_tokens"("token");
CREATE INDEX "telegram_connect_tokens_token_idx" ON "telegram_connect_tokens"("token");
CREATE INDEX "telegram_connect_tokens_masterId_idx" ON "telegram_connect_tokens"("masterId");
CREATE INDEX "telegram_connect_tokens_expiresAt_idx" ON "telegram_connect_tokens"("expiresAt");

ALTER TABLE "telegram_connect_tokens" ADD CONSTRAINT "telegram_connect_tokens_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
