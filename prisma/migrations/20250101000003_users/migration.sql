-- Users: пользователи
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
    "preferredLanguage" TEXT DEFAULT 'ro',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE INDEX "users_avatarFileId_idx" ON "users"("avatarFileId");
CREATE INDEX "users_phoneVerified_idx" ON "users"("phoneVerified");
CREATE INDEX "users_twoFactorEnabled_idx" ON "users"("twoFactorEnabled");
CREATE INDEX "users_suspiciousScore_idx" ON "users"("suspiciousScore");
CREATE INDEX "users_ipAddress_idx" ON "users"("ipAddress");
CREATE INDEX "users_role_isBanned_isVerified_idx" ON "users"("role", "isBanned", "isVerified");

ALTER TABLE "users" ADD CONSTRAINT "users_avatarFileId_fkey" FOREIGN KEY ("avatarFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Подписки на дайджест (email)
CREATE TABLE "digest_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "digest_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "digest_subscriptions_userId_key" ON "digest_subscriptions"("userId");

ALTER TABLE "digest_subscriptions" ADD CONSTRAINT "digest_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Согласия пользователя (GDPR / политики)
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_consents_userId_idx" ON "user_consents"("userId");
CREATE INDEX "user_consents_consentType_idx" ON "user_consents"("consentType");
CREATE INDEX "user_consents_createdAt_idx" ON "user_consents"("createdAt");
CREATE UNIQUE INDEX "user_consents_userId_consentType_key" ON "user_consents"("userId", "consentType");

ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
