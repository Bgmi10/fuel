/*
  Warnings:

  - A unique constraint covering the columns `[claimedInvoiceId]` on the table `Referral` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "claimedInvoiceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Referral_claimedInvoiceId_key" ON "Referral"("claimedInvoiceId");

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_claimedInvoiceId_fkey" FOREIGN KEY ("claimedInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
