-- Payments: платежи, тарифы, аналитика мастеров
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

CREATE UNIQUE INDEX "payments_stripeId_key" ON "payments"("stripeId");
CREATE UNIQUE INDEX "payments_stripeSession_key" ON "payments"("stripeSession");
CREATE INDEX "payments_masterId_idx" ON "payments"("masterId");
CREATE INDEX "payments_userId_idx" ON "payments"("userId");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");
CREATE INDEX "payments_masterId_status_createdAt_idx" ON "payments"("masterId", "status", "createdAt");
CREATE INDEX "payments_userId_status_createdAt_idx" ON "payments"("userId", "status", "createdAt");
CREATE INDEX "master_analytics_masterId_idx" ON "master_analytics"("masterId");
CREATE INDEX "master_analytics_date_idx" ON "master_analytics"("date");
CREATE INDEX "master_analytics_date_masterId_idx" ON "master_analytics"("date", "masterId");
CREATE UNIQUE INDEX "master_analytics_masterId_date_key" ON "master_analytics"("masterId", "date");
CREATE INDEX "tariffs_type_idx" ON "tariffs"("type");
CREATE INDEX "tariffs_isActive_idx" ON "tariffs"("isActive");
CREATE INDEX "tariffs_sortOrder_idx" ON "tariffs"("sortOrder");
CREATE UNIQUE INDEX "tariffs_type_key" ON "tariffs"("type");

ALTER TABLE "payments" ADD CONSTRAINT "payments_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "master_analytics" ADD CONSTRAINT "master_analytics_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
