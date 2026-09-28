-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "subCategoryId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "subCategoryId" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_subCategoryId_idx" ON "Invoice"("subCategoryId");

-- CreateIndex
CREATE INDEX "Subscription_subCategoryId_idx" ON "Subscription"("subCategoryId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "ServiceSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "ServiceSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
