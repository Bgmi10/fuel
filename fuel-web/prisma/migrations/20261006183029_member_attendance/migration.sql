-- CreateTable
CREATE TABLE "MemberAttendance" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "slotBookingId" TEXT,
    "slotId" TEXT,
    "checkInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateKey" TEXT NOT NULL,
    "sessionDeducted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberAttendance_slotBookingId_key" ON "MemberAttendance"("slotBookingId");

-- CreateIndex
CREATE INDEX "MemberAttendance_memberId_dateKey_idx" ON "MemberAttendance"("memberId", "dateKey");

-- CreateIndex
CREATE INDEX "MemberAttendance_branchId_dateKey_idx" ON "MemberAttendance"("branchId", "dateKey");

-- CreateIndex
CREATE INDEX "MemberAttendance_subscriptionId_idx" ON "MemberAttendance"("subscriptionId");

-- AddForeignKey
ALTER TABLE "MemberAttendance" ADD CONSTRAINT "MemberAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberAttendance" ADD CONSTRAINT "MemberAttendance_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberAttendance" ADD CONSTRAINT "MemberAttendance_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberAttendance" ADD CONSTRAINT "MemberAttendance_slotBookingId_fkey" FOREIGN KEY ("slotBookingId") REFERENCES "SlotBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
