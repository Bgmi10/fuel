-- CreateEnum
CREATE TYPE "ReferralRewardType" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE_DISCOUNT', 'MEMBERSHIP_DAYS');

-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "rewardMembershipDays" INTEGER,
ADD COLUMN     "rewardPercentage" DOUBLE PRECISION,
ADD COLUMN     "rewardType" "ReferralRewardType",
ALTER COLUMN "rewardAmount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "referralMembershipDays" INTEGER,
ADD COLUMN     "referralRewardPercentage" DOUBLE PRECISION,
ADD COLUMN     "referralRewardType" "ReferralRewardType" NOT NULL DEFAULT 'FIXED_AMOUNT',
ALTER COLUMN "referralRewardAmount" DROP NOT NULL,
ALTER COLUMN "referralRewardAmount" DROP DEFAULT;
