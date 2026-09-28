-- AlterTable
ALTER TABLE "ServiceSchedule" ADD COLUMN     "websiteContentId" TEXT;

-- AlterTable
ALTER TABLE "ServiceSubCategory" ADD COLUMN     "tagline" TEXT;

-- AlterTable
ALTER TABLE "ServiceWebsiteContent" ADD COLUMN     "description" TEXT,
ADD COLUMN     "title" TEXT;

-- AddForeignKey
ALTER TABLE "ServiceSchedule" ADD CONSTRAINT "ServiceSchedule_websiteContentId_fkey" FOREIGN KEY ("websiteContentId") REFERENCES "ServiceWebsiteContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
