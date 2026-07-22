-- CreateEnum
CREATE TYPE "WorkoutProgramAssignmentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "WorkoutVideo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "durationSeconds" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutProgram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutProgramItem" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "WorkoutProgramItem_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "WorkoutProgramItem_programId_idx" ON "WorkoutProgramItem"("programId");

-- CreateIndex
CREATE INDEX "WorkoutProgramItem_videoId_idx" ON "WorkoutProgramItem"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutProgramItem_programId_sortOrder_key" ON "WorkoutProgramItem"("programId", "sortOrder");

-- CreateIndex
CREATE INDEX "WorkoutProgramAssignment_branchId_scheduledAt_idx" ON "WorkoutProgramAssignment"("branchId", "scheduledAt");

-- CreateIndex
CREATE INDEX "WorkoutProgramAssignment_programId_idx" ON "WorkoutProgramAssignment"("programId");

-- AddForeignKey
ALTER TABLE "WorkoutProgramItem" ADD CONSTRAINT "WorkoutProgramItem_programId_fkey" FOREIGN KEY ("programId") REFERENCES "WorkoutProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutProgramItem" ADD CONSTRAINT "WorkoutProgramItem_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "WorkoutVideo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutProgramAssignment" ADD CONSTRAINT "WorkoutProgramAssignment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "WorkoutProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutProgramAssignment" ADD CONSTRAINT "WorkoutProgramAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
