-- AlterTable: add categoryId to jobs (nullable so existing rows are preserved)
ALTER TABLE "jobs" ADD COLUMN "categoryId" TEXT;

-- AddForeignKey: link jobs.categoryId to categories.id with SET NULL on delete
ALTER TABLE "jobs"
  ADD CONSTRAINT "jobs_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: speed up filtering / ranking by category
CREATE INDEX "jobs_categoryId_idx" ON "jobs"("categoryId");
