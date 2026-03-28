-- CreateTable
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

-- AlterTable: add documentsDeletedAt to master_verifications
ALTER TABLE "master_verifications" ADD COLUMN "documentsDeletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "user_consents_userId_idx" ON "user_consents"("userId");
CREATE INDEX "user_consents_consentType_idx" ON "user_consents"("consentType");
CREATE INDEX "user_consents_createdAt_idx" ON "user_consents"("createdAt");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "user_consents_userId_consentType_key" ON "user_consents"("userId", "consentType");

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
