/*
  Warnings:

  - Added the required column `branchName` to the `PaymentOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `finalPrice` to the `PaymentOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `memberName` to the `PaymentOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `memberPhone` to the `PaymentOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `packageDurationInDays` to the `PaymentOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `packageName` to the `PaymentOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceName` to the `PaymentOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branchName` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `finalPrice` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `packageDurationInDays` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `packageName` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceName` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PaymentOrder" ADD COLUMN     "branchName" TEXT NOT NULL,
ADD COLUMN     "finalPrice" INTEGER NOT NULL,
ADD COLUMN     "memberEmail" TEXT,
ADD COLUMN     "memberName" TEXT NOT NULL,
ADD COLUMN     "memberPhone" TEXT NOT NULL,
ADD COLUMN     "originalPrice" INTEGER,
ADD COLUMN     "packageDurationInDays" INTEGER NOT NULL,
ADD COLUMN     "packageName" TEXT NOT NULL,
ADD COLUMN     "serviceName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "branchName" TEXT NOT NULL,
ADD COLUMN     "finalPrice" INTEGER NOT NULL,
ADD COLUMN     "originalPrice" INTEGER,
ADD COLUMN     "packageDurationInDays" INTEGER NOT NULL,
ADD COLUMN     "packageName" TEXT NOT NULL,
ADD COLUMN     "serviceName" TEXT NOT NULL;
