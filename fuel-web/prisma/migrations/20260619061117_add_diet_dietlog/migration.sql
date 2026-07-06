/*
  Warnings:

  - You are about to drop the `DietMeal` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `targetCalories` to the `DietPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetCarbs` to the `DietPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetFat` to the `DietPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetProtein` to the `DietPlan` table without a default value. This is not possible if the table is not empty.
  - Made the column `endDate` on table `DietPlan` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "DietMeal" DROP CONSTRAINT "DietMeal_dietPlanId_fkey";

-- AlterTable
ALTER TABLE "DietPlan" ADD COLUMN     "targetCalories" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "targetCarbs" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "targetFat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "targetProtein" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "endDate" SET NOT NULL;

-- DropTable
DROP TABLE "DietMeal";

-- DropEnum
DROP TYPE "MealType";

-- CreateTable
CREATE TABLE "DietPlanMeal" (
    "id" TEXT NOT NULL,
    "dietPlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DietPlanMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodLog" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodLogMeal" (
    "id" TEXT NOT NULL,
    "foodLogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodLogMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodLogMealItem" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "externalFoodId" TEXT,
    "foodName" TEXT NOT NULL,
    "brandName" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "servingUnit" TEXT NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodLogMealItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietPlanMealItem" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "externalFoodId" TEXT,
    "foodName" TEXT NOT NULL,
    "brandName" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "servingUnit" TEXT NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DietPlanMealItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FoodLog_memberId_logDate_key" ON "FoodLog"("memberId", "logDate");

-- AddForeignKey
ALTER TABLE "DietPlanMeal" ADD CONSTRAINT "DietPlanMeal_dietPlanId_fkey" FOREIGN KEY ("dietPlanId") REFERENCES "DietPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodLog" ADD CONSTRAINT "FoodLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodLogMeal" ADD CONSTRAINT "FoodLogMeal_foodLogId_fkey" FOREIGN KEY ("foodLogId") REFERENCES "FoodLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodLogMealItem" ADD CONSTRAINT "FoodLogMealItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "FoodLogMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietPlanMealItem" ADD CONSTRAINT "DietPlanMealItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "DietPlanMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
