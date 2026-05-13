-- Make leadId nullable on conversations (support job-based chats without a lead)
ALTER TABLE "conversations" ALTER COLUMN "leadId" DROP NOT NULL;

-- Partial unique index: one job-chat per (master, client) pair when no lead
CREATE UNIQUE INDEX "conversations_masterId_clientId_key"
  ON "conversations"("masterId", "clientId")
  WHERE "leadId" IS NULL;
