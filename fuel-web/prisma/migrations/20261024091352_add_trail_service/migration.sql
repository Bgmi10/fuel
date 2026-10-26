-- CreateTable
CREATE TABLE "ServiceTrial" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "subCategoryId" TEXT,
    "days" INTEGER NOT NULL,
    "sellingPrice" INTEGER NOT NULL,
    "originalPrice" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTrial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceTrial_serviceId_idx" ON "ServiceTrial"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceTrial_subCategoryId_idx" ON "ServiceTrial"("subCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTrial_serviceId_subCategoryId_days_key" ON "ServiceTrial"("serviceId", "subCategoryId", "days");

-- AddForeignKey
ALTER TABLE "ServiceTrial" ADD CONSTRAINT "ServiceTrial_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTrial" ADD CONSTRAINT "ServiceTrial_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "ServiceSubCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
