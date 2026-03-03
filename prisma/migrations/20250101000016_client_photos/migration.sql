-- Client photos: фото клиентов (до/после)
CREATE TABLE "client_photos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_photos_userId_idx" ON "client_photos"("userId");
CREATE INDEX "client_photos_fileId_idx" ON "client_photos"("fileId");
CREATE INDEX "client_photos_order_idx" ON "client_photos"("order");
CREATE INDEX "client_photos_createdAt_idx" ON "client_photos"("createdAt");
CREATE UNIQUE INDEX "client_photos_userId_fileId_key" ON "client_photos"("userId", "fileId");

ALTER TABLE "client_photos" ADD CONSTRAINT "client_photos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_photos" ADD CONSTRAINT "client_photos_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
