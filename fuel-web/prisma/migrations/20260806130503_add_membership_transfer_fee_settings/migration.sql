-- AlterTable
ALTER TABLE "MembershipTransfer" ADD COLUMN     "baseTransferFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cgstAmount" DOUBLE PRECISION,
ADD COLUMN     "cgstPercentage" DOUBLE PRECISION,
ADD COLUMN     "feeSlabId" TEXT,
ADD COLUMN     "feeSlabLabel" TEXT,
ADD COLUMN     "feeSlabMaxDays" INTEGER,
ADD COLUMN     "feeSlabMinDays" INTEGER,
ADD COLUMN     "remainingDays" INTEGER,
ADD COLUMN     "sgstAmount" DOUBLE PRECISION,
ADD COLUMN     "sgstPercentage" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "membershipTransferFeeRules" JSONB NOT NULL DEFAULT '[]';
