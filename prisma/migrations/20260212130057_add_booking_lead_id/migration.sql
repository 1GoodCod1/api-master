-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('NEW_LEAD', 'LEAD_STATUS_UPDATED', 'NEW_REVIEW', 'NEW_CHAT_MESSAGE', 'SUBSCRIPTION_EXPIRING', 'SUBSCRIPTION_EXPIRED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'VERIFICATION_APPROVED', 'VERIFICATION_REJECTED', 'ADMIN_NEW_VERIFICATION', 'ADMIN_NEW_REPORT', 'ADMIN_NEW_USER', 'ADMIN_NEW_MASTER', 'ADMIN_SYSTEM_ALERT', 'ADMIN_NEW_LEAD', 'ADMIN_NEW_REVIEW', 'ADMIN_NEW_PAYMENT', 'LEAD_SENT', 'MASTER_RESPONDED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'SYSTEM_MAINTENANCE', 'SYSTEM_UPDATE');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'IN_APP';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "leadId" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "category" "NotificationCategory";

-- CreateIndex
CREATE INDEX "bookings_leadId_idx" ON "bookings"("leadId");

-- CreateIndex
CREATE INDEX "notifications_category_idx" ON "notifications"("category");

-- CreateIndex
CREATE INDEX "notifications_userId_category_createdAt_idx" ON "notifications"("userId", "category", "createdAt");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
