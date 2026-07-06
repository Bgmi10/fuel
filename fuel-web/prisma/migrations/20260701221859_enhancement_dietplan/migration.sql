-- CreateEnum
CREATE TYPE "MacroDistributionType" AS ENUM ('GRAMS', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "DietPlan" ADD COLUMN     "macroDistributionType" "MacroDistributionType" NOT NULL DEFAULT 'GRAMS',
ADD COLUMN     "targetCarbsPercentage" DOUBLE PRECISION,
ADD COLUMN     "targetFatPercentage" DOUBLE PRECISION,
ADD COLUMN     "targetProteinPercentage" DOUBLE PRECISION;
