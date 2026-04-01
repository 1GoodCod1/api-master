-- Reviews: отзывы, критерии, ответы, голоса
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientName" TEXT,
    "clientId" TEXT,
    "leadId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "moderatedBy" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "review_files" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "review_criteria" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_criteria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "review_replies" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "content" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "review_replies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "review_votes" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_votes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reviews_masterId_idx" ON "reviews"("masterId");
CREATE INDEX "reviews_clientPhone_idx" ON "reviews"("clientPhone");
CREATE INDEX "reviews_clientId_idx" ON "reviews"("clientId");
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");
CREATE INDEX "reviews_status_idx" ON "reviews"("status");
CREATE INDEX "reviews_createdAt_idx" ON "reviews"("createdAt");
CREATE INDEX "reviews_masterId_status_createdAt_idx" ON "reviews"("masterId", "status", "createdAt");
CREATE INDEX "reviews_masterId_rating_status_idx" ON "reviews"("masterId", "rating", "status");
CREATE UNIQUE INDEX "reviews_masterId_clientPhone_key" ON "reviews"("masterId", "clientPhone");
CREATE INDEX "reviews_leadId_idx" ON "reviews"("leadId");
CREATE UNIQUE INDEX "reviews_leadId_key" ON "reviews"("leadId");
CREATE UNIQUE INDEX "reviews_masterId_clientId_key" ON "reviews"("masterId", "clientId");
CREATE INDEX "review_files_reviewId_idx" ON "review_files"("reviewId");
CREATE INDEX "review_files_fileId_idx" ON "review_files"("fileId");
CREATE UNIQUE INDEX "review_files_reviewId_fileId_key" ON "review_files"("reviewId", "fileId");
CREATE INDEX "review_criteria_reviewId_idx" ON "review_criteria"("reviewId");
CREATE INDEX "review_criteria_criteria_idx" ON "review_criteria"("criteria");
CREATE UNIQUE INDEX "review_criteria_reviewId_criteria_key" ON "review_criteria"("reviewId", "criteria");
CREATE UNIQUE INDEX "review_replies_reviewId_key" ON "review_replies"("reviewId");
CREATE INDEX "review_replies_reviewId_idx" ON "review_replies"("reviewId");
CREATE INDEX "review_replies_masterId_idx" ON "review_replies"("masterId");
CREATE INDEX "review_votes_reviewId_idx" ON "review_votes"("reviewId");
CREATE INDEX "review_votes_userId_idx" ON "review_votes"("userId");
CREATE UNIQUE INDEX "review_votes_reviewId_userId_key" ON "review_votes"("reviewId", "userId");

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "review_files" ADD CONSTRAINT "review_files_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_files" ADD CONSTRAINT "review_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_criteria" ADD CONSTRAINT "review_criteria_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- masterId без FK: в schema.prisma у ReviewReply нет relation на Master (только reviewId → Review)
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
