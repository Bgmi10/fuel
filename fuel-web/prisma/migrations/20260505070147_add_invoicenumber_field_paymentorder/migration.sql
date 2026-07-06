/*
  Warnings:

  - You are about to drop the column `razorpaySignature` on the `PaymentOrder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PaymentOrder" DROP COLUMN "razorpaySignature";
