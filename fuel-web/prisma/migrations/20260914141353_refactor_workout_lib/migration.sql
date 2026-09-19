/*
  Warnings:

  - You are about to drop the column `name` on the `WorkoutProgram` table. All the data in the column will be lost.
  - You are about to drop the `WorkoutProgramAssignment` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `title` to the `WorkoutProgram` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WorkoutIntensityLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "WorkoutScheduleStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkoutBroadcastType" AS ENUM ('SCHEDULE', 'TIMER_ONLY');

-- CreateEnum
CREATE TYPE "WorkoutBroadcastStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkoutBroadcastTvStatus" AS ENUM ('PENDING', 'CONNECTING', 'LIVE', 'COMPLETED', 'FAILED', 'STOPPED');

-- CreateEnum
CREATE TYPE "WorkoutBroadcastEventType" AS ENUM ('CREATED', 'UPDATED', 'STARTED', 'STOPPED', 'COMPLETED', 'TV_CONNECTED', 'TV_DISCONNECTED', 'TV_FAILED', 'EXERCISE_STARTED', 'EXERCISE_COMPLETED');

-- DropForeignKey
ALTER TABLE "TvDevice" DROP CONSTRAINT "TvDevice_branchId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutProgramAssignment" DROP CONSTRAINT "WorkoutProgramAssignment_branchId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutProgramAssignment" DROP CONSTRAINT "WorkoutProgramAssignment_programId_fkey";

-- AlterTable
ALTER TABLE "WorkoutProgram" DROP COLUMN "name",
ADD COLUMN     "intensityLevel" "WorkoutIntensityLevel",
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WorkoutProgramItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "WorkoutProgramAssignment";

-- DropEnum
DROP TYPE "WorkoutProgramAssignmentStatus";

-- CreateTable
CREATE TABLE "WorkoutSchedule" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" "WorkoutScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "demonstrationSeconds" INTEGER,
    "warmupSeconds" INTEGER,
    "prepareSeconds" INTEGER,
    "workSeconds" INTEGER,
    "restSeconds" INTEGER,
    "sets" INTEGER,
    "cycles" INTEGER,
    "restBetweenCycleSeconds" INTEGER,
    "coolDownSeconds" INTEGER,
    "nextSessionStartsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutScheduleExercise" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "videoId" TEXT,
    "exerciseName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutScheduleExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutBroadcast" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "programId" TEXT,
    "type" "WorkoutBroadcastType" NOT NULL,
    "status" "WorkoutBroadcastStatus" NOT NULL DEFAULT 'DRAFT',
    "broadcastDate" TIMESTAMP(3) NOT NULL,
    "programTitle" TEXT,
    "programSubtitle" TEXT,
    "programDescription" TEXT,
    "intensityLevel" "WorkoutIntensityLevel",
    "demonstrationSeconds" INTEGER,
    "warmupSeconds" INTEGER,
    "prepareSeconds" INTEGER,
    "workSeconds" INTEGER,
    "restSeconds" INTEGER,
    "sets" INTEGER,
    "cycles" INTEGER,
    "restBetweenCycleSeconds" INTEGER,
    "coolDownSeconds" INTEGER,
    "nextSessionStartsAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutBroadcastExercise" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "videoId" TEXT,
    "exerciseName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutBroadcastExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutBroadcastTv" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "tvDeviceId" TEXT NOT NULL,
    "status" "WorkoutBroadcastTvStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutBroadcastTv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutBroadcastTvExercise" (
    "id" TEXT NOT NULL,
    "broadcastTvId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "WorkoutBroadcastTvExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutBroadcastEvent" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "tvDeviceId" TEXT,
    "eventType" "WorkoutBroadcastEventType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutBroadcastEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutSchedule_scheduledDate_idx" ON "WorkoutSchedule"("scheduledDate");

-- CreateIndex
CREATE INDEX "WorkoutSchedule_programId_idx" ON "WorkoutSchedule"("programId");

-- CreateIndex
CREATE INDEX "WorkoutSchedule_status_idx" ON "WorkoutSchedule"("status");

-- CreateIndex
CREATE INDEX "WorkoutScheduleExercise_scheduleId_idx" ON "WorkoutScheduleExercise"("scheduleId");

-- CreateIndex
CREATE INDEX "WorkoutScheduleExercise_videoId_idx" ON "WorkoutScheduleExercise"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutScheduleExercise_scheduleId_sortOrder_key" ON "WorkoutScheduleExercise"("scheduleId", "sortOrder");

-- CreateIndex
CREATE INDEX "WorkoutBroadcast_branchId_broadcastDate_idx" ON "WorkoutBroadcast"("branchId", "broadcastDate");

-- CreateIndex
CREATE INDEX "WorkoutBroadcast_scheduleId_idx" ON "WorkoutBroadcast"("scheduleId");

-- CreateIndex
CREATE INDEX "WorkoutBroadcast_programId_idx" ON "WorkoutBroadcast"("programId");

-- CreateIndex
CREATE INDEX "WorkoutBroadcast_status_idx" ON "WorkoutBroadcast"("status");

-- CreateIndex
CREATE INDEX "WorkoutBroadcast_type_idx" ON "WorkoutBroadcast"("type");

-- CreateIndex
CREATE INDEX "WorkoutBroadcastExercise_broadcastId_idx" ON "WorkoutBroadcastExercise"("broadcastId");

-- CreateIndex
CREATE INDEX "WorkoutBroadcastExercise_videoId_idx" ON "WorkoutBroadcastExercise"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutBroadcastExercise_broadcastId_sortOrder_key" ON "WorkoutBroadcastExercise"("broadcastId", "sortOrder");

-- CreateIndex
CREATE INDEX "WorkoutBroadcastTv_broadcastId_idx" ON "WorkoutBroadcastTv"("broadcastId");

-- CreateIndex
CREATE INDEX "WorkoutBroadcastTv_tvDeviceId_idx" ON "WorkoutBroadcastTv"("tvDeviceId");

-- CreateIndex
CREATE INDEX "WorkoutBroadcastTv_status_idx" ON "WorkoutBroadcastTv"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutBroadcastTv_broadcastId_tvDeviceId_key" ON "WorkoutBroadcastTv"("broadcastId", "tvDeviceId");

-- CreateIndex
CREATE INDEX "WorkoutBroadcastTvExercise_broadcastTvId_idx" ON "WorkoutBroadcastTvExercise"("broadcastTvId");

-- CreateIndex
CREATE INDEX "WorkoutBroadcastTvExercise_exerciseId_idx" ON "WorkoutBroadcastTvExercise"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutBroadcastTvExercise_broadcastTvId_exerciseId_key" ON "WorkoutBroadcastTvExercise"("broadcastTvId", "exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutBroadcastTvExercise_broadcastTvId_sortOrder_key" ON "WorkoutBroadcastTvExercise"("broadcastTvId", "sortOrder");

-- CreateIndex
CREATE INDEX "WorkoutBroadcastEvent_broadcastId_createdAt_idx" ON "WorkoutBroadcastEvent"("broadcastId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkoutBroadcastEvent_tvDeviceId_createdAt_idx" ON "WorkoutBroadcastEvent"("tvDeviceId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkoutBroadcastEvent_eventType_idx" ON "WorkoutBroadcastEvent"("eventType");

-- CreateIndex
CREATE INDEX "TvDevice_branchId_idx" ON "TvDevice"("branchId");

-- CreateIndex
CREATE INDEX "TvDevice_branchId_isOnline_idx" ON "TvDevice"("branchId", "isOnline");

-- CreateIndex
CREATE INDEX "TvPairingSession_status_idx" ON "TvPairingSession"("status");

-- CreateIndex
CREATE INDEX "TvPairingSession_expiresAt_idx" ON "TvPairingSession"("expiresAt");

-- CreateIndex
CREATE INDEX "TvPairingSession_deviceId_idx" ON "TvPairingSession"("deviceId");

-- CreateIndex
CREATE INDEX "WorkoutProgram_title_idx" ON "WorkoutProgram"("title");

-- CreateIndex
CREATE INDEX "WorkoutProgram_isActive_idx" ON "WorkoutProgram"("isActive");

-- CreateIndex
CREATE INDEX "WorkoutVideo_name_idx" ON "WorkoutVideo"("name");

-- CreateIndex
CREATE INDEX "WorkoutVideo_isActive_idx" ON "WorkoutVideo"("isActive");

-- AddForeignKey
ALTER TABLE "WorkoutSchedule" ADD CONSTRAINT "WorkoutSchedule_programId_fkey" FOREIGN KEY ("programId") REFERENCES "WorkoutProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutScheduleExercise" ADD CONSTRAINT "WorkoutScheduleExercise_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "WorkoutSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutScheduleExercise" ADD CONSTRAINT "WorkoutScheduleExercise_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "WorkoutVideo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcast" ADD CONSTRAINT "WorkoutBroadcast_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcast" ADD CONSTRAINT "WorkoutBroadcast_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "WorkoutSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcast" ADD CONSTRAINT "WorkoutBroadcast_programId_fkey" FOREIGN KEY ("programId") REFERENCES "WorkoutProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcastExercise" ADD CONSTRAINT "WorkoutBroadcastExercise_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "WorkoutBroadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcastExercise" ADD CONSTRAINT "WorkoutBroadcastExercise_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "WorkoutVideo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvDevice" ADD CONSTRAINT "TvDevice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcastTv" ADD CONSTRAINT "WorkoutBroadcastTv_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "WorkoutBroadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcastTv" ADD CONSTRAINT "WorkoutBroadcastTv_tvDeviceId_fkey" FOREIGN KEY ("tvDeviceId") REFERENCES "TvDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcastTvExercise" ADD CONSTRAINT "WorkoutBroadcastTvExercise_broadcastTvId_fkey" FOREIGN KEY ("broadcastTvId") REFERENCES "WorkoutBroadcastTv"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcastTvExercise" ADD CONSTRAINT "WorkoutBroadcastTvExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "WorkoutBroadcastExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TvPairingSession" ADD CONSTRAINT "TvPairingSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "TvDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcastEvent" ADD CONSTRAINT "WorkoutBroadcastEvent_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "WorkoutBroadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcastEvent" ADD CONSTRAINT "WorkoutBroadcastEvent_tvDeviceId_fkey" FOREIGN KEY ("tvDeviceId") REFERENCES "TvDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
