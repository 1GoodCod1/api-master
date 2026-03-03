-- Leads: заявки от клиентов
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientName" TEXT,
    "clientId" TEXT,
    "message" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "spamScore" INTEGER NOT NULL DEFAULT 0,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lead_files" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "leads_masterId_idx" ON "leads"("masterId");
CREATE INDEX "leads_clientPhone_idx" ON "leads"("clientPhone");
CREATE INDEX "leads_clientId_idx" ON "leads"("clientId");
CREATE INDEX "leads_status_idx" ON "leads"("status");
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");
CREATE INDEX "leads_masterId_status_createdAt_idx" ON "leads"("masterId", "status", "createdAt");
CREATE INDEX "leads_clientId_status_createdAt_idx" ON "leads"("clientId", "status", "createdAt");
CREATE INDEX "lead_files_leadId_idx" ON "lead_files"("leadId");
CREATE INDEX "lead_files_fileId_idx" ON "lead_files"("fileId");
CREATE UNIQUE INDEX "lead_files_leadId_fileId_key" ON "lead_files"("leadId", "fileId");

ALTER TABLE "leads" ADD CONSTRAINT "leads_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lead_files" ADD CONSTRAINT "lead_files_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_files" ADD CONSTRAINT "lead_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
