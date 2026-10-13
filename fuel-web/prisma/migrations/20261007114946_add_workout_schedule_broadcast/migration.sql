-- CreateEnum
CREATE TYPE "WorkoutBroadcastMode" AS ENUM ('SCHEDULE', 'TIMER_ONLY');

-- CreateEnum
CREATE TYPE "WorkoutBroadcastStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "WorkoutProgram" ADD COLUMN     "intensity" TEXT,
ADD COLUMN     "subtitle" TEXT;

-- CreateTable
CREATE TABLE "WorkoutSchedule" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "programId" TEXT NOT NULL,
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
    "branchId" TEXT,

    CONSTRAINT "WorkoutSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutScheduleExercise" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "videoId" TEXT,
    "exerciseName" TEXT,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "WorkoutScheduleExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutBroadcast" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "mode" "WorkoutBroadcastMode" NOT NULL,
    "status" "WorkoutBroadcastStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "subtitle" TEXT,
    "description" TEXT,
    "intensity" TEXT,
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

    CONSTRAINT "WorkoutBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutBroadcastExercise" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "videoId" TEXT,
    "exerciseName" TEXT,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "WorkoutBroadcastExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutBroadcastTV" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "tvDeviceId" TEXT NOT NULL,

    CONSTRAINT "WorkoutBroadcastTV_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutBroadcastTVExercise" (
    "id" TEXT NOT NULL,
    "broadcastTVId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "WorkoutBroadcastTVExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutSchedule_date_idx" ON "WorkoutSchedule"("date");

-- CreateIndex
CREATE INDEX "WorkoutSchedule_programId_idx" ON "WorkoutSchedule"("programId");

-- CreateIndex
CREATE INDEX "WorkoutScheduleExercise_scheduleId_idx" ON "WorkoutScheduleExercise"("scheduleId");

-- CreateIndex
CREATE INDEX "WorkoutScheduleExercise_videoId_idx" ON "WorkoutScheduleExercise"("videoId");

-- CreateIndex
CREATE INDEX "WorkoutBroadcast_branchId_idx" ON "WorkoutBroadcast"("branchId");

-- CreateIndex
CREATE INDEX "WorkoutBroadcast_scheduleId_idx" ON "WorkoutBroadcast"("scheduleId");

-- CreateIndex
CREATE INDEX "WorkoutBroadcastExercise_broadcastId_idx" ON "WorkoutBroadcastExercise"("broadcastId");

-- CreateIndex
CREATE INDEX "WorkoutBroadcastExercise_videoId_idx" ON "WorkoutBroadcastExercise"("videoId");

-- CreateIndex
CREATE INDEX "WorkoutBroadcastTV_tvDeviceId_idx" ON "WorkoutBroadcastTV"("tvDeviceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutBroadcastTV_broadcastId_tvDeviceId_key" ON "WorkoutBroadcastTV"("broadcastId", "tvDeviceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutBroadcastTVExercise_broadcastTVId_exerciseId_key" ON "WorkoutBroadcastTVExercise"("broadcastTVId", "exerciseId");

-- AddForeignKey
ALTER TABLE "WorkoutSchedule" ADD CONSTRAINT "WorkoutSchedule_programId_fkey" FOREIGN KEY ("programId") REFERENCES "WorkoutProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSchedule" ADD CONSTRAINT "WorkoutSchedule_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutScheduleExercise" ADD CONSTRAINT "WorkoutScheduleExercise_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "WorkoutSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutScheduleExercise" ADD CONSTRAINT "WorkoutScheduleExercise_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "WorkoutVideo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcast" ADD CONSTRAINT "WorkoutBroadcast_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcast" ADD CONSTRAINT "WorkoutBroadcast_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "WorkoutSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcastExercise" ADD CONSTRAINT "WorkoutBroadcastExercise_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "WorkoutBroadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcastExercise" ADD CONSTRAINT "WorkoutBroadcastExercise_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "WorkoutVideo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcastTV" ADD CONSTRAINT "WorkoutBroadcastTV_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "WorkoutBroadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcastTV" ADD CONSTRAINT "WorkoutBroadcastTV_tvDeviceId_fkey" FOREIGN KEY ("tvDeviceId") REFERENCES "TvDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcastTVExercise" ADD CONSTRAINT "WorkoutBroadcastTVExercise_broadcastTVId_fkey" FOREIGN KEY ("broadcastTVId") REFERENCES "WorkoutBroadcastTV"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutBroadcastTVExercise" ADD CONSTRAINT "WorkoutBroadcastTVExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "WorkoutBroadcastExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
