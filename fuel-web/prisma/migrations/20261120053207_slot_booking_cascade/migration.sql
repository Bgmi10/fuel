-- DropForeignKey
ALTER TABLE "SlotBooking" DROP CONSTRAINT "SlotBooking_slotId_fkey";

-- AddForeignKey
ALTER TABLE "SlotBooking" ADD CONSTRAINT "SlotBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
