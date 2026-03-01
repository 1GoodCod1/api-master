-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'WHATSAPP';

-- AlterTable
ALTER TABLE "masters" ADD COLUMN     "whatsappPhone" TEXT;
