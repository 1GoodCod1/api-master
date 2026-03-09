-- AlterTable
ALTER TABLE "masters" ADD COLUMN "notifyTariffSms" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "masters" ADD COLUMN "notifyTariffInApp" BOOLEAN NOT NULL DEFAULT true;
