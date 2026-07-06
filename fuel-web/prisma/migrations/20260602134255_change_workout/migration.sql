/*
  Warnings:

  - You are about to drop the column `day` on the `WorkoutExercise` table. All the data in the column will be lost.
  - Added the required column `dayNumber` to the `WorkoutExercise` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WorkoutExercise" DROP COLUMN "day",
ADD COLUMN     "dayNumber" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "WorkoutDay";
