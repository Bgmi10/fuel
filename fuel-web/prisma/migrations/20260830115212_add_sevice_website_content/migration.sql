-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "thumbnailImage" TEXT;

-- CreateTable
CREATE TABLE "ServiceWebsiteContent" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "eyebrow" TEXT,
    "heroTitle" TEXT,
    "intro" JSONB,
    "closing" TEXT,
    "tagline" TEXT,
    "benefits" JSONB,
    "idealFor" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceWebsiteContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceSubCategory" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceSubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceSchedule" (
    "id" TEXT NOT NULL,
    "subCategoryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "times" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceWebsiteContent_serviceId_key" ON "ServiceWebsiteContent"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceSubCategory_serviceId_idx" ON "ServiceSubCategory"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceSchedule_subCategoryId_idx" ON "ServiceSchedule"("subCategoryId");

-- AddForeignKey
ALTER TABLE "ServiceWebsiteContent" ADD CONSTRAINT "ServiceWebsiteContent_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSubCategory" ADD CONSTRAINT "ServiceSubCategory_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSchedule" ADD CONSTRAINT "ServiceSchedule_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "ServiceSubCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
