-- Favorites: избранное, подписки на доступность мастера
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "master_availability_subscriptions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    CONSTRAINT "master_availability_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "favorites_userId_idx" ON "favorites"("userId");
CREATE INDEX "favorites_masterId_idx" ON "favorites"("masterId");
CREATE INDEX "favorites_userId_createdAt_idx" ON "favorites"("userId", "createdAt");
CREATE INDEX "favorites_masterId_createdAt_idx" ON "favorites"("masterId", "createdAt");
CREATE UNIQUE INDEX "favorites_userId_masterId_key" ON "favorites"("userId", "masterId");
CREATE INDEX "master_availability_subscriptions_clientId_idx" ON "master_availability_subscriptions"("clientId");
CREATE INDEX "master_availability_subscriptions_masterId_idx" ON "master_availability_subscriptions"("masterId");
CREATE INDEX "master_availability_subscriptions_masterId_notifiedAt_idx" ON "master_availability_subscriptions"("masterId", "notifiedAt");
CREATE UNIQUE INDEX "master_availability_subscriptions_clientId_masterId_key" ON "master_availability_subscriptions"("clientId", "masterId");

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "master_availability_subscriptions" ADD CONSTRAINT "master_availability_subscriptions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "master_availability_subscriptions" ADD CONSTRAINT "master_availability_subscriptions_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
