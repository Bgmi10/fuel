-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "height" DOUBLE PRECISION,
ADD COLUMN     "onBoardingForm" JSONB,
ADD COLUMN     "weight" DOUBLE PRECISION;
