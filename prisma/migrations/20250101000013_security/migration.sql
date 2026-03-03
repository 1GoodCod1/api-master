-- Security: чёрный список IP, активность пользователей
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

CREATE UNIQUE INDEX "ip_blacklist_ipAddress_key" ON "ip_blacklist"("ipAddress");
CREATE INDEX "ip_blacklist_ipAddress_idx" ON "ip_blacklist"("ipAddress");
CREATE INDEX "ip_blacklist_expiresAt_idx" ON "ip_blacklist"("expiresAt");
CREATE INDEX "user_activities_userId_idx" ON "user_activities"("userId");
CREATE INDEX "user_activities_sessionId_idx" ON "user_activities"("sessionId");
CREATE INDEX "user_activities_action_idx" ON "user_activities"("action");
CREATE INDEX "user_activities_masterId_idx" ON "user_activities"("masterId");
CREATE INDEX "user_activities_categoryId_idx" ON "user_activities"("categoryId");
CREATE INDEX "user_activities_createdAt_idx" ON "user_activities"("createdAt");
