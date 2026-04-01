-- Email drip: прогресс цепочек писем по пользователю
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

CREATE INDEX "email_drip_statuses_userId_idx" ON "email_drip_statuses"("userId");
CREATE INDEX "email_drip_statuses_status_nextSendAt_idx" ON "email_drip_statuses"("status", "nextSendAt");
CREATE UNIQUE INDEX "email_drip_statuses_userId_chainType_key" ON "email_drip_statuses"("userId", "chainType");

ALTER TABLE "email_drip_statuses" ADD CONSTRAINT "email_drip_statuses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
