/*
  Warnings:

  - You are about to drop the column `stripeId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSession` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `stripePriceId` on the `tariffs` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'QUALIFIED', 'REWARDED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "review_replies" DROP CONSTRAINT "review_replies_masterId_fkey";

-- DropIndex
DROP INDEX "idx_masters_available_now";

-- DropIndex
DROP INDEX "idx_masters_search_main";

-- DropIndex
DROP INDEX "idx_masters_search_vector";

-- DropIndex
DROP INDEX "idx_masters_tariff_expiry";

-- DropIndex
DROP INDEX "masters_availabilityStatus_idx";

-- DropIndex
DROP INDEX "masters_avatarFileId_idx";

-- DropIndex
DROP INDEX "masters_isBusy_idx";

-- DropIndex
DROP INDEX "masters_isOnline_idx";

-- DropIndex
DROP INDEX "masters_lastActivityAt_idx";

-- DropIndex
DROP INDEX "masters_latitude_longitude_idx";

-- DropIndex
DROP INDEX "masters_lifetimePremium_idx";

-- DropIndex
DROP INDEX "masters_pendingVerification_idx";

-- DropIndex
DROP INDEX "masters_slug_idx";

-- DropIndex
DROP INDEX "payments_stripeId_key";

-- DropIndex
DROP INDEX "payments_stripeSession_key";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "stripeId",
DROP COLUMN "stripeSession";

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "leadId" TEXT;

-- AlterTable
ALTER TABLE "tariffs" DROP COLUMN "stripePriceId";

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referralCodeId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "rewardGranted" BOOLEAN NOT NULL DEFAULT false,
    "rewardGrantedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_drip_statuses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chainType" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "nextSendAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_drip_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_userId_key" ON "referral_codes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE INDEX "referral_codes_code_idx" ON "referral_codes"("code");

-- CreateIndex
CREATE INDEX "referral_codes_userId_idx" ON "referral_codes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referredUserId_key" ON "referrals"("referredUserId");

-- CreateIndex
CREATE INDEX "referrals_referralCodeId_idx" ON "referrals"("referralCodeId");

-- CreateIndex
CREATE INDEX "referrals_referredUserId_idx" ON "referrals"("referredUserId");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE INDEX "email_drip_statuses_userId_idx" ON "email_drip_statuses"("userId");

-- CreateIndex
CREATE INDEX "email_drip_statuses_status_nextSendAt_idx" ON "email_drip_statuses"("status", "nextSendAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_drip_statuses_userId_chainType_key" ON "email_drip_statuses"("userId", "chainType");

-- CreateIndex
CREATE INDEX "reviews_leadId_idx" ON "reviews"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_leadId_key" ON "reviews"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_masterId_clientId_key" ON "reviews"("masterId", "clientId");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_drip_statuses" ADD CONSTRAINT "email_drip_statuses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
