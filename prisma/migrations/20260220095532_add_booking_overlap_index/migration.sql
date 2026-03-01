-- CreateIndex
CREATE INDEX "bookings_masterId_startTime_endTime_idx" ON "bookings"("masterId", "startTime", "endTime");
