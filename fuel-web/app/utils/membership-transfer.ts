// app/utils/membership-transfer.ts
//
// Single source of truth for HOW a membership is transferred.
// Used by:
//   1. POST /api/subscriptions/[id]/transfer        (cash / UPI / card)
//   2. Razorpay webhook (payment.captured, TRANSFER) (Razorpay)
//
// Money convention (same as before):
//   - quote amounts are in RUPEES
//   - the database stores PAISE, converted once with toPaise()

import { Prisma } from "@prisma/client";
import { calculateMembershipTransferQuote } from "@/src/lib/membership-transfer-fee";

export class TransferError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "TransferError";
    this.status = status;
  }
}

export const allowedTransferRoles = new Set(["ADMIN", "MANAGER", "STAFF"]);

/**
 * The quote and the modal work in RUPEES. The database stores
 * money in PAISE, so convert once, right before saving.
 */
export const toPaise = (rupees: number | null | undefined) =>
  Math.round(Number(rupees ?? 0) * 100);

export type MembershipTransferQuote = Awaited<
  ReturnType<typeof calculateMembershipTransferQuote>
>;

export type ExecuteMembershipTransferArgs = {
  subscriptionId: string;
  toMemberId: string;
  reason: string;
  notes?: string | null;
  paymentMode?: string | null;

  /** PAISE. null when the caller did not provide an amount. */
  amountCollectedPaise: number | null;

  transferredById: string;

  /**
   * Manual flow: omit. The fee is calculated here, inside the
   * transaction, exactly like before.
   *
   * Razorpay flow: pass the quote that was snapshotted when the
   * order was created, so the MembershipTransfer record matches
   * the amount the customer actually paid (the slab can change
   * with the number of remaining days between order and payment).
   */
  quote?: MembershipTransferQuote;

  /** Razorpay flow: the TRANSFER_FEE invoice that holds this payment. */
  transferInvoiceId?: string | null;
};

export async function executeMembershipTransfer(
  tx: Prisma.TransactionClient,
  args: ExecuteMembershipTransferArgs
) {
  const {
    subscriptionId,
    toMemberId,
    reason,
    transferredById,
    amountCollectedPaise,
  } = args;

  const subscription = await tx.subscription.findUnique({
    where: {
      id: subscriptionId,
    },

    select: {
      id: true,
      memberId: true,
      status: true,
      invoiceId: true,

      member: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },
    },
  });

  if (!subscription) {
    throw new TransferError("Subscription was not found.", 404);
  }

  if (subscription.status !== "ACTIVE" && subscription.status !== "FROZEN") {
    throw new TransferError(
      "Only active or frozen memberships can be transferred."
    );
  }

  if (subscription.memberId === toMemberId) {
    throw new TransferError(
      "The membership already belongs to the selected member."
    );
  }

  const receivingMember = await tx.member.findUnique({
    where: {
      id: toMemberId,
    },

    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      status: true,
    },
  });

  if (!receivingMember) {
    throw new TransferError("The receiving member was not found.", 404);
  }

  if (receivingMember.status !== "ACTIVE") {
    throw new TransferError("A blocked member cannot receive a membership.");
  }

  /*
   * Calculate the fee using the subscription
   * and central settings inside this transaction.
   *
   * Never trust a fee provided by the frontend.
   * (quote amounts are in RUPEES)
   */
  let quote: MembershipTransferQuote;

  if (args.quote) {
    quote = args.quote;
  } else {
    try {
      quote = await calculateMembershipTransferQuote(subscriptionId, tx);
    } catch (error) {
      throw new TransferError(
        error instanceof Error
          ? error.message
          : "Unable to calculate the membership transfer fee."
      );
    }
  }

  const fromMemberId = subscription.memberId;

  /*
   * Update only if the subscription still
   * belongs to the same member.
   *
   * This prevents concurrent transfers.
   */
  const subscriptionUpdate = await tx.subscription.updateMany({
    where: {
      id: subscriptionId,
      memberId: fromMemberId,

      status: {
        in: ["ACTIVE", "FROZEN"],
      },
    },

    data: {
      memberId: receivingMember.id,
    },
  });

  if (subscriptionUpdate.count !== 1) {
    throw new TransferError(
      "This membership was already changed by another admin. Please refresh and try again.",
      409
    );
  }

  /*
   * Transfer the original invoice and
   * payment ownership.
   */
  if (subscription.invoiceId) {
    await tx.invoice.update({
      where: {
        id: subscription.invoiceId,
      },

      data: {
        memberId: receivingMember.id,

        memberName: receivingMember.name,

        memberPhone: receivingMember.phone,

        memberEmail: receivingMember.email,
      },
    });

    await tx.payment.updateMany({
      where: {
        invoiceId: subscription.invoiceId,
      },

      data: {
        memberId: receivingMember.id,
      },
    });
  }

  /*
   * MembershipTransfer.toSubscriptionId is UNIQUE and powers
   * Subscription.incomingTransfer.
   *
   * If this membership was transferred before (A -> B, now
   * B -> C), release the old link first so only the LATEST
   * transfer is the "incoming" one.
   */
  await tx.membershipTransfer.updateMany({
    where: {
      toSubscriptionId: subscriptionId,
    },

    data: {
      toSubscriptionId: null,
    },
  });

  /*
   * Store the complete transfer-fee snapshot, in PAISE.
   *
   * Future changes to central settings will not
   * affect this historical transfer record.
   */
  const transfer = await tx.membershipTransfer.create({
    data: {
      subscriptionId,

      fromMemberId,

      amountCollected: amountCollectedPaise,
      notes: args.notes?.trim() || null,
      paymentMode: args.paymentMode || null,

      toMemberId: receivingMember.id,

      toSubscriptionId: subscriptionId,

      // Razorpay flow links the fee invoice. Manual flow leaves it null.
      transferInvoiceId: args.transferInvoiceId ?? null,

      reason,

      remainingDays: quote.remainingDays,

      feeSlabId: quote.slab.id,

      feeSlabLabel: quote.slab.label,

      feeSlabMinDays: quote.slab.minDays,

      feeSlabMaxDays: quote.slab.maxDays,

      // ---- money: rupees -> paise ----
      baseTransferFee: toPaise(quote.baseTransferFee),

      cgstAmount: toPaise(quote.cgstAmount),

      sgstAmount: toPaise(quote.sgstAmount),

      transferFee: toPaise(quote.transferFee),

      // percentages are NOT money, store as-is
      cgstPercentage: quote.cgstPercentage,

      sgstPercentage: quote.sgstPercentage,

      transferredById,
    },
  });

  return {
    transferId: transfer.id,

    subscriptionId,

    fromMember: {
      id: subscription.member.id,
      name: subscription.member.name,
      phone: subscription.member.phone,
    },

    toMember: {
      id: receivingMember.id,
      name: receivingMember.name,
      phone: receivingMember.phone,
    },

    reason,

    // Response keeps the quote's RUPEE values, so the
    // transfer modal that reads it keeps working.
    fee: {
      remainingDays: quote.remainingDays,

      slab: quote.slab,

      baseTransferFee: quote.baseTransferFee,

      cgstPercentage: quote.cgstPercentage,

      sgstPercentage: quote.sgstPercentage,

      cgstAmount: quote.cgstAmount,

      sgstAmount: quote.sgstAmount,

      transferFee: quote.transferFee,
    },
  };
}