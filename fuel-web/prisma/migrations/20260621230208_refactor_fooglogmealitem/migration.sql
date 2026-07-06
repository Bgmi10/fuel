-- AlterTable
ALTER TABLE "FoodLogMealItem" ADD COLUMN     "consumed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consumedAt" TIMESTAMP(3);
