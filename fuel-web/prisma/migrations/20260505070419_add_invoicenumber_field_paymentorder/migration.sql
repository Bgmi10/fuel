/*
  Warnings:

  - A unique constraint covering the columns `[invoiceNumber]` on the table `PaymentOrder` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `invoiceNumber` to the `PaymentOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PaymentOrder" ADD COLUMN     "invoiceNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_invoiceNumber_key" ON "PaymentOrder"("invoiceNumber");
