/*
  Warnings:

  - A unique constraint covering the columns `[legacyId]` on the table `Member` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "legacyId" TEXT,
ADD COLUMN     "legacyPhone" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Member_legacyId_key" ON "Member"("legacyId");
