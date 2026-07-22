/*
  Warnings:

  - You are about to drop the column `packageId` on the `Slot` table. All the data in the column will be lost.
  - Added the required column `serviceId` to the `Slot` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Slot" DROP CONSTRAINT "Slot_packageId_fkey";

-- AlterTable
ALTER TABLE "Slot" DROP COLUMN "packageId",
ADD COLUMN     "serviceId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
