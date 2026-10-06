-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "linkedSubscriptionId" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_linkedSubscriptionId_idx" ON "Invoice"("linkedSubscriptionId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_linkedSubscriptionId_fkey" FOREIGN KEY ("linkedSubscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
