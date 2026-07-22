/*
  Warnings:

  - You are about to drop the column `copiedFromPlan` on the `FoodLogMeal` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FoodLogMeal" DROP COLUMN "copiedFromPlan";

-- AlterTable
ALTER TABLE "FoodLogMealItem" ADD COLUMN     "copiedFromDietItemId" TEXT;
