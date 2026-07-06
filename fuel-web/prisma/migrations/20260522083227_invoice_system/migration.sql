/*
  Warnings:

  - You are about to drop the column `paymentOrderId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the `PaymentOrder` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[invoiceId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "InvoiceIntent" AS ENUM ('NEW', 'EXTEND', 'UPGRADE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PARTIAL_PAID', 'FULLY_PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('INITIAL', 'BALANCE');

-- CreateEnum
CREATE TYPE "InvoicePaymentStatus" AS ENUM ('PAID', 'FAILED', 'REFUNDED');

-- DropForeignKey
ALTER TABLE "PaymentOrder" DROP CONSTRAINT "PaymentOrder_branchId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentOrder" DROP CONSTRAINT "PaymentOrder_memberId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentOrder" DROP CONSTRAINT "PaymentOrder_packageId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentOrder" DROP CONSTRAINT "PaymentOrder_salesRepId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_paymentOrderId_fkey";

-- DropIndex
DROP INDEX "Subscription_paymentOrderId_key";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "paymentOrderId",
ADD COLUMN     "invoiceId" TEXT;

-- DropTable
DROP TABLE "PaymentOrder";

-- DropEnum
DROP TYPE "IntentType";

-- DropEnum
DROP TYPE "PaymentStatus";

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "salesRepId" TEXT,
    "salesRepName" TEXT,
    "intent" "InvoiceIntent" NOT NULL,
    "serviceName" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "packageDurationInDays" INTEGER NOT NULL,
    "branchName" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "memberPhone" TEXT NOT NULL,
    "memberEmail" TEXT,
    "packageAmount" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "finalAmount" INTEGER NOT NULL,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "balanceAmount" INTEGER NOT NULL,
    "cgstPercentage" DOUBLE PRECISION,
    "sgstPercentage" DOUBLE PRECISION,
    "cgstAmount" DOUBLE PRECISION,
    "sgstAmount" DOUBLE PRECISION,
    "totalTax" DOUBLE PRECISION,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "status" "InvoicePaymentStatus" NOT NULL DEFAULT 'PAID',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_invoiceId_key" ON "Subscription"("invoiceId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
