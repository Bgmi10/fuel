-- CreateEnum
CREATE TYPE "MembershipUsageType" AS ENUM ('DURATION_BASED', 'SESSION_BASED');

-- AlterTable
ALTER TABLE "ServicePackage" ADD COLUMN     "totalSessions" INTEGER,
ADD COLUMN     "usageType" "MembershipUsageType" NOT NULL DEFAULT 'DURATION_BASED';

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "remainingSessions" INTEGER,
ADD COLUMN     "totalSessions" INTEGER,
ADD COLUMN     "usageType" "MembershipUsageType" NOT NULL DEFAULT 'DURATION_BASED';

-- CreateIndex
CREATE INDEX "Subscription_memberId_status_idx" ON "Subscription"("memberId", "status");

-- CreateIndex
CREATE INDEX "Subscription_usageType_remainingSessions_idx" ON "Subscription"("usageType", "remainingSessions");
