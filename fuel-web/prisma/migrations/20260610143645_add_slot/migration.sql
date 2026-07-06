-- CreateEnum
CREATE TYPE "SlotBookingEnum" AS ENUM ('BOOKED', 'ATTENDED');

-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotBooking" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "checkedInAt" TIMESTAMP(3),
    "status" "SlotBookingEnum" NOT NULL DEFAULT 'BOOKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlotBooking_slotId_bookingDate_idx" ON "SlotBooking"("slotId", "bookingDate");

-- CreateIndex
CREATE INDEX "SlotBooking_memberId_idx" ON "SlotBooking"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "SlotBooking_memberId_slotId_bookingDate_key" ON "SlotBooking"("memberId", "slotId", "bookingDate");

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotBooking" ADD CONSTRAINT "SlotBooking_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotBooking" ADD CONSTRAINT "SlotBooking_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotBooking" ADD CONSTRAINT "SlotBooking_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotBooking" ADD CONSTRAINT "SlotBooking_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotBooking" ADD CONSTRAINT "SlotBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
