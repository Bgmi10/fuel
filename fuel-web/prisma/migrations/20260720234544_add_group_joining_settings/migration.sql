-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "groupDiscountPercentage" DOUBLE PRECISION,
ADD COLUMN     "groupMemberCount" INTEGER;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "groupDiscountRules" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "groupJoiningEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "groupJoiningMaxMembers" INTEGER NOT NULL DEFAULT 10;
