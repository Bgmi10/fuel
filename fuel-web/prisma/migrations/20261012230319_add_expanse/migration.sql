-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('RENT', 'UTILITIES', 'SALARY', 'EQUIPMENT', 'MAINTENANCE', 'MARKETING', 'SUPPLIES', 'INSURANCE', 'TAXES', 'OTHER');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "expenseType" "ExpenseType" NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX "Expense_byUserId_date_idx" ON "Expense"("byUserId", "date");
