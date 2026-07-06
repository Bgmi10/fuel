/*
  Warnings:

  - Added the required column `intent` to the `PaymentOrder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "IntentType" AS ENUM ('NEW', 'EXTEND');

-- AlterTable
ALTER TABLE "PaymentOrder" ADD COLUMN     "intent" "IntentType" NOT NULL;
