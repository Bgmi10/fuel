/*
  Warnings:

  - You are about to drop the column `intensityLevel` on the `WorkoutProgram` table. All the data in the column will be lost.
  - You are about to drop the column `subtitle` on the `WorkoutProgram` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `WorkoutProgram` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `WorkoutProgramItem` table. All the data in the column will be lost.
  - You are about to drop the `WorkoutBroadcast` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkoutBroadcastEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkoutBroadcastExercise` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkoutBroadcastTv` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkoutBroadcastTvExercise` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkoutSchedule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkoutScheduleExercise` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `name` to the `WorkoutProgram` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WorkoutProgramAssignmentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "TvDevice" DROP CONSTRAINT "TvDevice_branchId_fkey";

-- DropForeignKey
ALTER TABLE "TvPairingSession" DROP CONSTRAINT "TvPairingSession_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutBroadcast" DROP CONSTRAINT "WorkoutBroadcast_branchId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutBroadcast" DROP CONSTRAINT "WorkoutBroadcast_programId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutBroadcast" DROP CONSTRAINT "WorkoutBroadcast_scheduleId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutBroadcastEvent" DROP CONSTRAINT "WorkoutBroadcastEvent_broadcastId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutBroadcastEvent" DROP CONSTRAINT "WorkoutBroadcastEvent_tvDeviceId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutBroadcastExercise" DROP CONSTRAINT "WorkoutBroadcastExercise_broadcastId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutBroadcastExercise" DROP CONSTRAINT "WorkoutBroadcastExercise_videoId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutBroadcastTv" DROP CONSTRAINT "WorkoutBroadcastTv_broadcastId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutBroadcastTv" DROP CONSTRAINT "WorkoutBroadcastTv_tvDeviceId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutBroadcastTvExercise" DROP CONSTRAINT "WorkoutBroadcastTvExercise_broadcastTvId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutBroadcastTvExercise" DROP CONSTRAINT "WorkoutBroadcastTvExercise_exerciseId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutSchedule" DROP CONSTRAINT "WorkoutSchedule_programId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutScheduleExercise" DROP CONSTRAINT "WorkoutScheduleExercise_scheduleId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutScheduleExercise" DROP CONSTRAINT "WorkoutScheduleExercise_videoId_fkey";

-- DropIndex
DROP INDEX "TvDevice_branchId_idx";

-- DropIndex
DROP INDEX "TvDevice_branchId_isOnline_idx";

-- DropIndex
DROP INDEX "TvPairingSession_deviceId_idx";

-- DropIndex
DROP INDEX "TvPairingSession_expiresAt_idx";

-- DropIndex
DROP INDEX "TvPairingSession_status_idx";

-- DropIndex
DROP INDEX "WorkoutProgram_isActive_idx";

-- DropIndex
DROP INDEX "WorkoutProgram_title_idx";

-- DropIndex
DROP INDEX "WorkoutVideo_isActive_idx";

-- DropIndex
DROP INDEX "WorkoutVideo_name_idx";

-- AlterTable
ALTER TABLE "WorkoutProgram" DROP COLUMN "intensityLevel",
DROP COLUMN "subtitle",
DROP COLUMN "title",
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WorkoutProgramItem" DROP COLUMN "createdAt";

-- DropTable
DROP TABLE "WorkoutBroadcast";

-- DropTable
DROP TABLE "WorkoutBroadcastEvent";

-- DropTable
DROP TABLE "WorkoutBroadcastExercise";

-- DropTable
DROP TABLE "WorkoutBroadcastTv";

-- DropTable
DROP TABLE "WorkoutBroadcastTvExercise";

-- DropTable
DROP TABLE "WorkoutSchedule";

-- DropTable
DROP TABLE "WorkoutScheduleExercise";

-- DropEnum
DROP TYPE "WorkoutBroadcastEventType";

-- DropEnum
DROP TYPE "WorkoutBroadcastStatus";

-- DropEnum
DROP TYPE "WorkoutBroadcastTvStatus";

-- DropEnum
DROP TYPE "WorkoutBroadcastType";

-- DropEnum
DROP TYPE "WorkoutIntensityLevel";

-- DropEnum
DROP TYPE "WorkoutScheduleStatus";

-- CreateTable
CREATE TABLE "WorkoutProgramAssignment" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "WorkoutProgramAssignmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutProgramAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutProgramAssignment_branchId_scheduledAt_idx" ON "WorkoutProgramAssignment"("branchId", "scheduledAt");

-- CreateIndex
CREATE INDEX "WorkoutProgramAssignment_programId_idx" ON "WorkoutProgramAssignment"("programId");

-- AddForeignKey
ALTER TABLE "WorkoutProgramAssignment" ADD CONSTRAINT "WorkoutProgramAssignment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "WorkoutProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvDevice" ADD CONSTRAINT "TvDevice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
