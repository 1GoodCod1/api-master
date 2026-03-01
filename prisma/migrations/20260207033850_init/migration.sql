/*
  Warnings:

  - The values [pending,sent,failed,delivered,read] on the enum `NotificationStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [sms,telegram,email,push] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `firstName` on the `masters` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `masters` table. All the data in the column will be lost.
  - The `availabilityStatus` column on the `masters` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE');

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationStatus_new" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DELIVERED', 'READ');
ALTER TABLE "public"."notifications" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "notifications" ALTER COLUMN "status" TYPE "NotificationStatus_new" USING ("status"::text::"NotificationStatus_new");
ALTER TYPE "NotificationStatus" RENAME TO "NotificationStatus_old";
ALTER TYPE "NotificationStatus_new" RENAME TO "NotificationStatus";
DROP TYPE "public"."NotificationStatus_old";
ALTER TABLE "notifications" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('SMS', 'TELEGRAM', 'EMAIL', 'PUSH');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;

-- DropIndex
DROP INDEX "leads_masterId_status_idx";

-- DropIndex
DROP INDEX "notifications_userId_status_idx";

-- DropIndex
DROP INDEX "payments_masterId_status_idx";

-- DropIndex
DROP INDEX "payments_userId_status_idx";

-- DropIndex
DROP INDEX "reviews_masterId_status_idx";

-- DropIndex
DROP INDEX "users_isBanned_isVerified_idx";

-- DropIndex
DROP INDEX "users_role_isBanned_idx";

-- AlterTable
ALTER TABLE "masters" DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "availabilityStatus",
ADD COLUMN     "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "masters_availabilityStatus_idx" ON "masters"("availabilityStatus");

-- CreateIndex
CREATE INDEX "masters_availabilityStatus_currentActiveLeads_idx" ON "masters"("availabilityStatus", "currentActiveLeads");
