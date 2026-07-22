-- CreateEnum
CREATE TYPE "TvPairingStatus" AS ENUM ('WAITING', 'PAIRED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TvDevice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "pairedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TvDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TvPairingSession" (
    "id" TEXT NOT NULL,
    "pairingCode" TEXT NOT NULL,
    "socketId" TEXT,
    "status" "TvPairingStatus" NOT NULL DEFAULT 'WAITING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT,

    CONSTRAINT "TvPairingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TvDevice_deviceToken_key" ON "TvDevice"("deviceToken");

-- CreateIndex
CREATE UNIQUE INDEX "TvPairingSession_pairingCode_key" ON "TvPairingSession"("pairingCode");

-- AddForeignKey
ALTER TABLE "TvDevice" ADD CONSTRAINT "TvDevice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
