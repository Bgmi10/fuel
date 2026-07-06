-- AlterTable
ALTER TABLE "DietPlanMealItem" ADD COLUMN     "nutritionMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "FoodLogMealItem" ADD COLUMN     "nutritionMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "servingValue" DOUBLE PRECISION NOT NULL DEFAULT 0;
