-- Ideas: идеи пользователей, голосование
CREATE TABLE "ideas" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IdeaStatus" NOT NULL DEFAULT 'PENDING',
    "authorId" TEXT NOT NULL,
    "votesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "implementedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    CONSTRAINT "ideas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "idea_votes" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "idea_votes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ideas_status_idx" ON "ideas"("status");
CREATE INDEX "ideas_votesCount_idx" ON "ideas"("votesCount");
CREATE INDEX "ideas_createdAt_idx" ON "ideas"("createdAt");
CREATE INDEX "ideas_authorId_idx" ON "ideas"("authorId");
CREATE INDEX "idea_votes_ideaId_idx" ON "idea_votes"("ideaId");
CREATE INDEX "idea_votes_userId_idx" ON "idea_votes"("userId");
CREATE UNIQUE INDEX "idea_votes_ideaId_userId_key" ON "idea_votes"("ideaId", "userId");

ALTER TABLE "ideas" ADD CONSTRAINT "ideas_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "idea_votes" ADD CONSTRAINT "idea_votes_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "idea_votes" ADD CONSTRAINT "idea_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
