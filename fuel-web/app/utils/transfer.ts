import { Prisma } from "@prisma/client";
import { addDaysUTC, nowUTC } from "@/app/utils/date";

export async function executeSubscriptionTransfer(
  tx: Prisma.TransactionClient,
  args: {
    invoiceId: string;
    metadata: any; // PaymentMetadata (see below)
    paymentMode: string;
    amountCollected: number;
  }
) {
  const { invoiceId, metadata: m, paymentMode, amountCollected } = args;

  const source = await tx.subscription.findUnique({
    where: { id: m.subscriptionId },
  });

  if (
    !source ||
    source.memberId !== m.fromMemberId ||
    !["ACTIVE", "FROZEN"].includes(source.status)
  ) {
    throw new Error(`Subscription ${m.subscriptionId} is no longer transferable`);
  }

  const now = nowUTC();

  const newSubscription = await tx.subscription.create({
    data: {
      memberId: m.toMemberId,
      branchId: source.branchId,
      packageId: source.packageId,
      subCategoryId: source.subCategoryId,
      serviceName: source.serviceName,
      packageName: source.packageName,
      packageDurationInDays: source.packageDurationInDays,
      originalPrice: source.originalPrice,
      finalPrice: source.finalPrice,
      branchName: source.branchName,
      usageType: source.usageType,
      totalSessions: source.totalSessions,
      remainingSessions: source.remainingSessions,
      startDate: now,
      endDate: addDaysUTC(now, m.remainingDays),
      status: "ACTIVE",
    },
  });

  await tx.subscription.update({
    where: { id: source.id },
    data: { status: "TRANSFERRED" },
  });

  await tx.membershipTransfer.create({
    data: {
      subscriptionId: source.id,
      fromMemberId: m.fromMemberId,
      toMemberId: m.toMemberId,
      toSubscriptionId: newSubscription.id,
      reason: m.reason,
      notes: m.transferNotes,
      remainingDays: m.remainingDays,
      amountCollected,
      paymentMode,
      feeSlabId: m.slab?.id,
      feeSlabLabel: m.slab?.label,
      feeSlabMinDays: m.slab?.minDays,
      feeSlabMaxDays: m.slab?.maxDays,
      baseTransferFee: m.baseTransferFee,
      cgstPercentage: m.cgstPercentage,
      sgstPercentage: m.sgstPercentage,
      cgstAmount: m.cgstAmount,
      sgstAmount: m.sgstAmount,
      transferFee: m.transferFee,
      transferInvoiceId: invoiceId,
      transferredById: m.transferredById,
    },
  });
}