/*
  Warnings:

  - Added the required column `address` to the `Branch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gstNumber` to the `Branch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `Branch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "gstNumber" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PaymentOrder" ADD COLUMN     "paymentMethod" TEXT;
