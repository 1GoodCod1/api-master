-- Bookings: бронирования
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "leadId" TEXT,
    "clientPhone" TEXT NOT NULL,
    "clientName" TEXT,
    "clientId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "serviceName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_reminders" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_reminders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bookings_masterId_idx" ON "bookings"("masterId");
CREATE INDEX "bookings_leadId_idx" ON "bookings"("leadId");
CREATE INDEX "bookings_clientPhone_idx" ON "bookings"("clientPhone");
CREATE INDEX "bookings_clientId_idx" ON "bookings"("clientId");
CREATE INDEX "bookings_startTime_idx" ON "bookings"("startTime");
CREATE INDEX "bookings_status_idx" ON "bookings"("status");
CREATE INDEX "bookings_createdAt_idx" ON "bookings"("createdAt");
CREATE INDEX "bookings_masterId_status_startTime_idx" ON "bookings"("masterId", "status", "startTime");
CREATE INDEX "bookings_masterId_status_createdAt_idx" ON "bookings"("masterId", "status", "createdAt");
CREATE INDEX "bookings_masterId_startTime_idx" ON "bookings"("masterId", "startTime");
CREATE INDEX "bookings_masterId_startTime_endTime_idx" ON "bookings"("masterId", "startTime", "endTime");
CREATE INDEX "bookings_clientId_status_createdAt_idx" ON "bookings"("clientId", "status", "createdAt");
CREATE INDEX "booking_reminders_bookingId_idx" ON "booking_reminders"("bookingId");
CREATE INDEX "booking_reminders_sentAt_idx" ON "booking_reminders"("sentAt");
CREATE INDEX "booking_reminders_type_idx" ON "booking_reminders"("type");
CREATE UNIQUE INDEX "booking_reminders_bookingId_type_key" ON "booking_reminders"("bookingId", "type");

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "booking_reminders" ADD CONSTRAINT "booking_reminders_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
