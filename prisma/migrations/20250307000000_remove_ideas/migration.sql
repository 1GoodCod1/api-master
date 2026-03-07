-- DropForeignKey
ALTER TABLE "idea_votes" DROP CONSTRAINT IF EXISTS "idea_votes_ideaId_fkey";
ALTER TABLE "idea_votes" DROP CONSTRAINT IF EXISTS "idea_votes_userId_fkey";
ALTER TABLE "ideas" DROP CONSTRAINT IF EXISTS "ideas_authorId_fkey";

-- DropTable
DROP TABLE IF EXISTS "idea_votes";
DROP TABLE IF EXISTS "ideas";

-- DropEnum
DROP TYPE IF EXISTS "IdeaStatus";
