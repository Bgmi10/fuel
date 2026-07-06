/*
  Warnings:

  - You are about to drop the column `referredName` on the `Referral` table. All the data in the column will be lost.
  - You are about to drop the column `referredPhone` on the `Referral` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Referral" DROP COLUMN "referredName",
DROP COLUMN "referredPhone",
ADD COLUMN     "rewardIssuedAt" TIMESTAMP(3);
