-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF', 'MANAGER', 'COACH');

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "supportEmail" TEXT,
ADD COLUMN     "supportPhone" TEXT,
ADD COLUMN     "terms" TEXT;

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "cgstPercentage" INTEGER NOT NULL,
    "sgstPercentage" INTEGER NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
