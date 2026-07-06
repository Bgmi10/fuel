/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Member` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OTPType" AS ENUM ('PHONE', 'EMAIL');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "otpCode" TEXT,
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "otpType" "OTPType",
ADD COLUMN     "otpVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");
