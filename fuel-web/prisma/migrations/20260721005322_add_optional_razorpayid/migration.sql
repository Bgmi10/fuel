-- DropIndex
DROP INDEX "Payment_razorpayOrderId_key";

-- CreateIndex
CREATE INDEX "Payment_razorpayOrderId_idx" ON "Payment"("razorpayOrderId");
