-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('PENDING', 'CONTACTED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "TrialStatus" AS ENUM ('PENDING', 'CONFIRMED_BY_ADMIN', 'CONFIRMED_BY_USER', 'CANCELLED_BY_USER');

-- CreateEnum
CREATE TYPE "WhatsAppStatus" AS ENUM ('NOT_SENT', 'SENT', 'DELIVERED', 'REPLIED');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEB', 'INSTAGRAM', 'REFERRAL', 'WALKIN');

-- CreateEnum
CREATE TYPE "FitnessGoal" AS ENUM ('FAT_LOSS', 'MUSCLE_GAIN', 'STRENGTH', 'GENERAL_FITNESS');

-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- CreateTable
CREATE TABLE "ContactInquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "message" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'PENDING',
    "source" "LeadSource" NOT NULL DEFAULT 'WEB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialBooking" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "goal" "FitnessGoal",
    "preferredTime" "TimeSlot",
    "scheduledDate" TIMESTAMP(3),
    "status" "TrialStatus" NOT NULL DEFAULT 'PENDING',
    "whatsappStatus" "WhatsAppStatus" NOT NULL DEFAULT 'NOT_SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialBooking_pkey" PRIMARY KEY ("id")
);
