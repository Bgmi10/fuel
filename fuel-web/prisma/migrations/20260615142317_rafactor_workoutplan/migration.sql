/*
  Warnings:

  - You are about to drop the column `dayNumber` on the `WorkoutExercise` table. All the data in the column will be lost.
  - You are about to drop the column `durationMinutes` on the `WorkoutExercise` table. All the data in the column will be lost.
  - You are about to drop the column `workoutPlanId` on the `WorkoutExercise` table. All the data in the column will be lost.
  - Added the required column `workoutDayId` to the `WorkoutExercise` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "WorkoutExercise" DROP CONSTRAINT "WorkoutExercise_workoutPlanId_fkey";

-- AlterTable
ALTER TABLE "WorkoutExercise" DROP COLUMN "dayNumber",
DROP COLUMN "durationMinutes",
DROP COLUMN "workoutPlanId",
ADD COLUMN     "restSeconds" INTEGER,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weight" DECIMAL(65,30),
ADD COLUMN     "workoutDayId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "WorkoutDay" (
    "id" TEXT NOT NULL,
    "workoutPlanId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutDay_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkoutDay" ADD CONSTRAINT "WorkoutDay_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_workoutDayId_fkey" FOREIGN KEY ("workoutDayId") REFERENCES "WorkoutDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
