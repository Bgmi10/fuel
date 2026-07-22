-- CreateTable
CREATE TABLE "MembershipTransfer" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "reason" TEXT,
    "transferFee" INTEGER NOT NULL DEFAULT 0,
    "transferredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MembershipTransfer_subscriptionId_idx" ON "MembershipTransfer"("subscriptionId");

-- CreateIndex
CREATE INDEX "MembershipTransfer_fromMemberId_idx" ON "MembershipTransfer"("fromMemberId");

-- CreateIndex
CREATE INDEX "MembershipTransfer_toMemberId_idx" ON "MembershipTransfer"("toMemberId");

-- AddForeignKey
ALTER TABLE "MembershipTransfer" ADD CONSTRAINT "MembershipTransfer_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipTransfer" ADD CONSTRAINT "MembershipTransfer_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipTransfer" ADD CONSTRAINT "MembershipTransfer_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipTransfer" ADD CONSTRAINT "MembershipTransfer_transferredById_fkey" FOREIGN KEY ("transferredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
