/*
  Warnings:

  - A unique constraint covering the columns `[transferInvoiceId]` on the table `MembershipTransfer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[toSubscriptionId]` on the table `MembershipTransfer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "InvoiceIntent" ADD VALUE 'TRANSFER_FEE';

-- AlterEnum
ALTER TYPE "PaymentType" ADD VALUE 'TRANSFER';

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'TRANSFERRED';

-- AlterTable
ALTER TABLE "MembershipTransfer" ADD COLUMN     "toSubscriptionId" TEXT,
ADD COLUMN     "transferInvoiceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MembershipTransfer_transferInvoiceId_key" ON "MembershipTransfer"("transferInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipTransfer_toSubscriptionId_key" ON "MembershipTransfer"("toSubscriptionId");

-- AddForeignKey
ALTER TABLE "MembershipTransfer" ADD CONSTRAINT "MembershipTransfer_transferInvoiceId_fkey" FOREIGN KEY ("transferInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipTransfer" ADD CONSTRAINT "MembershipTransfer_toSubscriptionId_fkey" FOREIGN KEY ("toSubscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
