-- CreateTable
CREATE TABLE "email_template_overrides" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "subject" TEXT,
    "bodyHtml" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_template_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_template_overrides_templateId_lang_key" ON "email_template_overrides"("templateId", "lang");
