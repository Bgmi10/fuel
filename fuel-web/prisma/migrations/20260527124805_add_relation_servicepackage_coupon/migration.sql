-- CreateTable
CREATE TABLE "_CouponPackages" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CouponPackages_AB_unique" ON "_CouponPackages"("A", "B");

-- CreateIndex
CREATE INDEX "_CouponPackages_B_index" ON "_CouponPackages"("B");

-- AddForeignKey
ALTER TABLE "_CouponPackages" ADD CONSTRAINT "_CouponPackages_A_fkey" FOREIGN KEY ("A") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CouponPackages" ADD CONSTRAINT "_CouponPackages_B_fkey" FOREIGN KEY ("B") REFERENCES "ServicePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
