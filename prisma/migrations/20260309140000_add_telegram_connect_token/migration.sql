-- CreateTable
CREATE TABLE "telegram_connect_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_connect_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_connect_tokens_token_key" ON "telegram_connect_tokens"("token");

-- CreateIndex
CREATE INDEX "telegram_connect_tokens_token_idx" ON "telegram_connect_tokens"("token");

-- CreateIndex
CREATE INDEX "telegram_connect_tokens_masterId_idx" ON "telegram_connect_tokens"("masterId");

-- CreateIndex
CREATE INDEX "telegram_connect_tokens_expiresAt_idx" ON "telegram_connect_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "telegram_connect_tokens" ADD CONSTRAINT "telegram_connect_tokens_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
