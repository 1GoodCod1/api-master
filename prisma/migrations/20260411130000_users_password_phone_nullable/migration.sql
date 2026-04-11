-- Синхронизация с schema.prisma: OAuth и частично заполненные профили могут иметь NULL password/phone.
-- DROP NOT NULL безопасен, если ограничение уже снято (PostgreSQL просто оставит колонку nullable).
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;
