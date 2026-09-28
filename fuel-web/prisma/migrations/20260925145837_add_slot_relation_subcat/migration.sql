-- AlterTable
ALTER TABLE "Slot" ADD COLUMN     "subCategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "ServiceSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
