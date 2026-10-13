/*
  Warnings:

  - You are about to drop the column `date` on the `WorkoutBroadcast` table. All the data in the column will be lost.
  - The `intensity` column on the `WorkoutBroadcast` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `intensity` column on the `WorkoutProgram` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `branchId` on the `WorkoutSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `WorkoutSchedule` table. All the data in the column will be lost.
  - You are about to drop the `WorkoutProgramAssignment` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[broadcastId,sortOrder]` on the table `WorkoutBroadcastExercise` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[broadcastTVId,sortOrder]` on the table `WorkoutBroadcastTVExercise` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[scheduleId,sortOrder]` on the table `WorkoutScheduleExercise` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dateKey` to the `WorkoutBroadcast` table without a default value. This is not possible if the table is not empty.
  - Made the column `exerciseName` on table `WorkoutBroadcastExercise` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `dateKey` to the `WorkoutSchedule` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WorkoutIntensity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterEnum
ALTER TYPE "WorkoutBroadcastStatus" ADD VALUE 'PAUSED';

-- DropForeignKey
ALTER TABLE "WorkoutBroadcastTV" DROP CONSTRAINT "WorkoutBroadcastTV_tvDeviceId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutProgramAssignment" DROP CONSTRAINT "WorkoutProgramAssignment_programId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutSchedule" DROP CONSTRAINT "WorkoutSchedule_branchId_fkey";

-- DropIndex
DROP INDEX "WorkoutBroadcast_branchId_idx";

-- DropIndex
DROP INDEX "WorkoutSchedule_date_idx";

-- AlterTable
ALTER TABLE "TvDevice" ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WorkoutBroadcast" DROP COLUMN "date",
ADD COLUMN     "dateKey" TEXT NOT NULL,
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "pausedTotalMs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "intensity",
ADD COLUMN     "intensity" "WorkoutIntensity";

-- AlterTable
ALTER TABLE "WorkoutBroadcastExercise" ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "thumbnailUrl" TEXT,
ADD COLUMN     "videoUrl" TEXT,
ALTER COLUMN "exerciseName" SET NOT NULL;

-- AlterTable
ALTER TABLE "WorkoutProgram" DROP COLUMN "intensity",
ADD COLUMN     "intensity" "WorkoutIntensity";

-- AlterTable
ALTER TABLE "WorkoutSchedule" DROP COLUMN "branchId",
DROP COLUMN "date",
ADD COLUMN     "dateKey" TEXT NOT NULL;

-- DropTable
DROP TABLE "WorkoutProgramAssignment";

-- DropEnum
DROP TYPE "WorkoutProgramAssignmentStatus";

-- CreateIndex
CREATE INDEX "TvDevice_branchId_idx" ON "TvDevice"("branchId");

-- CreateIndex
CREATE INDEX "TvPairingSession_expiresAt_idx" ON "TvPairingSession"("expiresAt");

-- CreateIndex
CREATE INDEX "WorkoutBroadcast_branchId_dateKey_idx" ON "WorkoutBroadcast"("branchId", "dateKey");

-- CreateIndex
CREATE INDEX "WorkoutBroadcast_branchId_status_idx" ON "WorkoutBroadcast"("branchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutBroadcastExercise_broadcastId_sortOrder_key" ON "WorkoutBroadcastExercise"("broadcastId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutBroadcastTVExercise_broadcastTVId_sortOrder_key" ON "WorkoutBroadcastTVExercise"("broadcastTVId", "sortOrder");

-- CreateIndex
CREATE INDEX "WorkoutSchedule_dateKey_idx" ON "WorkoutSchedule"("dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutScheduleExercise_scheduleId_sortOrder_key" ON "WorkoutScheduleExercise"("scheduleId", "sortOrder");

-- CreateIndex
CREATE INDEX "WorkoutVideo_isActive_idx" ON "WorkoutVideo"("isActive");

-- CreateIndex
CREATE INDEX "WorkoutVideo_name_idx" ON "WorkoutVideo"("name");

-- AddForeignKey
ALTER TABLE "WorkoutBroadcastTV" ADD CONSTRAINT "WorkoutBroadcastTV_tvDeviceId_fkey" FOREIGN KEY ("tvDeviceId") REFERENCES "TvDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
