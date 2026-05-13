-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationCategory" ADD VALUE 'JOB_NOT_SELECTED';
ALTER TYPE "NotificationCategory" ADD VALUE 'JOINTS_CREDITED';
ALTER TYPE "NotificationCategory" ADD VALUE 'JOINTS_SPENT';

-- AlterTable
ALTER TABLE "job_application_photos" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "job_applications" ADD COLUMN     "deadline" INTEGER,
ADD COLUMN     "milestones" JSONB,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "job_photos" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "jobs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "joints_transactions" ALTER COLUMN "id" DROP DEFAULT;
