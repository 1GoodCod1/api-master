-- Jobs & Joints feature: job board, joints currency, applications

-- Enums
CREATE TYPE "JobType" AS ENUM ('FIXED_PRICE', 'HOURLY');
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'FOUND', 'CLOSED');
CREATE TYPE "ApplicationPaymentType" AS ENUM ('FULL', 'PARTIAL');
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'SELECTED', 'REJECTED');
CREATE TYPE "JointsTransactionType" AS ENUM ('SUBSCRIPTION_CREDIT', 'PURCHASE', 'APPLICATION_SPEND', 'REFUND');

-- Notification categories
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'JOB_APPLICATION_RECEIVED';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'JOB_APPLICATION_VIEWED';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'JOB_MASTER_SELECTED';

-- joints balance on masters
ALTER TABLE "masters" ADD COLUMN IF NOT EXISTS "jointsBalance" INTEGER NOT NULL DEFAULT 0;

-- jobs
CREATE TABLE "jobs" (
  "id"                    TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  "clientId"              TEXT          NOT NULL,
  "title"                 VARCHAR(200)  NOT NULL,
  "description"           VARCHAR(3000) NOT NULL,
  "type"                  "JobType"     NOT NULL,
  "budget"                DECIMAL(65,30),
  "hourlyRate"            DECIMAL(65,30),
  "minJoints"             INTEGER       NOT NULL DEFAULT 1,
  "status"                "JobStatus"   NOT NULL DEFAULT 'OPEN',
  "selectedApplicationId" TEXT          UNIQUE,
  "createdAt"             TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "jobs_clientId_idx" ON "jobs"("clientId");
CREATE INDEX "jobs_status_idx" ON "jobs"("status");
CREATE INDEX "jobs_type_idx" ON "jobs"("type");
CREATE INDEX "jobs_createdAt_idx" ON "jobs"("createdAt");
CREATE INDEX "jobs_clientId_status_createdAt_idx" ON "jobs"("clientId", "status", "createdAt");

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- job_photos
CREATE TABLE "job_photos" (
  "id"        TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "jobId"     TEXT         NOT NULL,
  "fileId"    TEXT         NOT NULL,
  "order"     INTEGER      NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "job_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_photos_jobId_idx" ON "job_photos"("jobId");
CREATE INDEX "job_photos_jobId_order_idx" ON "job_photos"("jobId", "order");

ALTER TABLE "job_photos" ADD CONSTRAINT "job_photos_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_photos" ADD CONSTRAINT "job_photos_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- job_applications
CREATE TABLE "job_applications" (
  "id"          TEXT                     NOT NULL DEFAULT gen_random_uuid()::text,
  "jobId"       TEXT                     NOT NULL,
  "masterId"    TEXT                     NOT NULL,
  "jointsSpent" INTEGER                  NOT NULL,
  "description" VARCHAR(3000)            NOT NULL,
  "paymentType" "ApplicationPaymentType" NOT NULL,
  "status"      "ApplicationStatus"      NOT NULL DEFAULT 'PENDING',
  "viewedAt"    TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)             NOT NULL,

  CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "job_applications_jobId_masterId_key" UNIQUE ("jobId", "masterId")
);

CREATE INDEX "job_applications_jobId_idx" ON "job_applications"("jobId");
CREATE INDEX "job_applications_masterId_idx" ON "job_applications"("masterId");
CREATE INDEX "job_applications_jobId_jointsSpent_idx" ON "job_applications"("jobId", "jointsSpent");
CREATE INDEX "job_applications_status_idx" ON "job_applications"("status");
CREATE INDEX "job_applications_createdAt_idx" ON "job_applications"("createdAt");

ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_masterId_fkey"
  FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- selectedApplicationId FK (added after job_applications table exists)
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_selectedApplicationId_fkey"
  FOREIGN KEY ("selectedApplicationId") REFERENCES "job_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- job_application_photos
CREATE TABLE "job_application_photos" (
  "id"            TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "applicationId" TEXT         NOT NULL,
  "fileId"        TEXT         NOT NULL,
  "order"         INTEGER      NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "job_application_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_application_photos_applicationId_idx" ON "job_application_photos"("applicationId");
CREATE INDEX "job_application_photos_applicationId_order_idx" ON "job_application_photos"("applicationId", "order");

ALTER TABLE "job_application_photos" ADD CONSTRAINT "job_application_photos_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_application_photos" ADD CONSTRAINT "job_application_photos_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- joints_transactions
CREATE TABLE "joints_transactions" (
  "id"            TEXT                    NOT NULL DEFAULT gen_random_uuid()::text,
  "masterId"      TEXT                    NOT NULL,
  "amount"        INTEGER                 NOT NULL,
  "type"          "JointsTransactionType" NOT NULL,
  "description"   TEXT,
  "applicationId" TEXT,
  "paymentId"     TEXT,
  "createdAt"     TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "joints_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "joints_transactions_masterId_idx" ON "joints_transactions"("masterId");
CREATE INDEX "joints_transactions_type_idx" ON "joints_transactions"("type");
CREATE INDEX "joints_transactions_createdAt_idx" ON "joints_transactions"("createdAt");
CREATE INDEX "joints_transactions_masterId_createdAt_idx" ON "joints_transactions"("masterId", "createdAt");

ALTER TABLE "joints_transactions" ADD CONSTRAINT "joints_transactions_masterId_fkey"
  FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add optional city to jobs
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "cityId" TEXT;
CREATE INDEX IF NOT EXISTS "jobs_cityId_idx" ON "jobs"("cityId");
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_cityId_fkey"
  FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
