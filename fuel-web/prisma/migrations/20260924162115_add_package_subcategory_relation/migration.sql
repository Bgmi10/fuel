-- CreateTable
CREATE TABLE "ServicePackageSubCategory" (
    "packageId" TEXT NOT NULL,
    "subCategoryId" TEXT NOT NULL,

    CONSTRAINT "ServicePackageSubCategory_pkey" PRIMARY KEY ("packageId","subCategoryId")
);

-- CreateIndex
CREATE INDEX "ServicePackageSubCategory_subCategoryId_idx" ON "ServicePackageSubCategory"("subCategoryId");

-- AddForeignKey
ALTER TABLE "ServicePackageSubCategory" ADD CONSTRAINT "ServicePackageSubCategory_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackageSubCategory" ADD CONSTRAINT "ServicePackageSubCategory_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "ServiceSubCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
